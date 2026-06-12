import {
  OwnerType,
  OrderStatus,
  PaymentProvider,
  PaymentStatus,
  Prisma,
  TransactionStatus,
} from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { AppError, ConflictError, NotFoundError, ValidationError } from '../utils/errors';
import { createOrder, getOrderById, getOrderByNumber, updateOrderPaymentStatus } from './order.service';
import { createTransaction, updateTransactionStatus } from './transaction.service';
import {
  getPaymentAccountCredentials,
  initiatePhonePePayment,
  getPhonePeOrderStatus,
  initiatePhonePeRefund,
  validatePhonePeCallback,
} from './phonepe.service';
import {
  createRazorpayOrder,
  getRazorpayCredentials,
  verifyRazorpaySignature,
} from './razorpay.service';
import { logAudit, AuditActions } from './audit.service';
import { logger } from '../config/logger';

const ADMIN_OWNER_ID = 'platform';

async function getAppSettings() {
  return prisma.appSettings.upsert({
    where: { id: 'default' },
    create: {},
    update: {},
  });
}

function buildRedirectUrl(path: string): string {
  if (path.startsWith('http')) return path;
  const base = env.FRONTEND_URL.replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}

function resolveOwner(ownerType: OwnerType, vendorId?: string) {
  if (ownerType === OwnerType.VENDOR) {
    if (!vendorId) throw new ValidationError('vendorId required for vendor payments');
    return { ownerType: OwnerType.VENDOR, ownerId: vendorId };
  }
  return { ownerType: OwnerType.ADMIN, ownerId: ADMIN_OWNER_ID };
}

export interface CreatePaymentInput {
  serviceName: string;
  vendorName?: string;
  vendorId?: string;
  quantity: number;
  price: number;
  discount?: number;
  applyGst?: boolean;
  userId?: string;
  idempotencyKey?: string;
  ownerType?: OwnerType;
  provider?: PaymentProvider;
}

export async function getPaymentGateways() {
  const settings = await getAppSettings();
  const gateways: Array<{ id: string; name: string; enabled: boolean }> = [];

  if (settings.phonepeEnabled) {
    try {
      await getPaymentAccountCredentials(OwnerType.ADMIN, ADMIN_OWNER_ID);
      gateways.push({ id: 'PHONEPE', name: 'PhonePe', enabled: true });
    } catch {
      if (env.PHONEPE_CLIENT_ID) {
        gateways.push({ id: 'PHONEPE', name: 'PhonePe', enabled: true });
      }
    }
  }

  if (settings.razorpayEnabled) {
    try {
      await getRazorpayCredentials(OwnerType.ADMIN, ADMIN_OWNER_ID);
      gateways.push({ id: 'RAZORPAY', name: 'Razorpay', enabled: true });
    } catch {
      if (env.RAZORPAY_KEY_ID) {
        gateways.push({ id: 'RAZORPAY', name: 'Razorpay', enabled: true });
      }
    }
  }

  return {
    paymentsEnabled: settings.paymentsEnabled,
    gateways,
  };
}

export async function createPayment(input: CreatePaymentInput, ipAddress?: string) {
  const settings = await getAppSettings();
  if (!settings.paymentsEnabled) {
    throw new AppError(503, 'Online payments are temporarily unavailable', 'PAYMENTS_DISABLED');
  }

  const provider = input.provider ?? PaymentProvider.PHONEPE;

  if (provider === PaymentProvider.PHONEPE && !settings.phonepeEnabled) {
    throw new AppError(503, 'PhonePe payments are disabled', 'PAYMENTS_DISABLED');
  }
  if (provider === PaymentProvider.RAZORPAY && !settings.razorpayEnabled) {
    throw new AppError(503, 'Razorpay payments are disabled', 'PAYMENTS_DISABLED');
  }

  const owner = resolveOwner(input.ownerType ?? OwnerType.ADMIN, input.vendorId);

  const existingPaid = input.idempotencyKey
    ? await prisma.order.findFirst({
        where: {
          idempotencyKey: input.idempotencyKey,
          paymentStatus: PaymentStatus.PAID,
        },
      })
    : null;

  if (existingPaid) {
    throw new ConflictError('Payment already completed for this request');
  }

  const order = await createOrder({
    serviceName: input.serviceName,
    vendorName: input.vendorName,
    vendorId: input.vendorId,
    quantity: input.quantity,
    price: input.price,
    discount: input.discount,
    applyGst: input.applyGst,
    userId: input.userId,
    idempotencyKey: input.idempotencyKey,
  });

  const amount = Number(order.amount);
  if (amount < 1) {
    throw new ValidationError('Amount must be at least ₹1');
  }

  const amountPaisa = Math.round(amount * 100);
  if (amountPaisa < 100) {
    throw new ValidationError('Minimum payment amount is ₹1');
  }

  const tx = await createTransaction(order.id, amount, provider);

  await prisma.order.update({
    where: { id: order.id },
    data: { paymentStatus: PaymentStatus.PROCESSING },
  });

  await logAudit(AuditActions.PAYMENT_INITIATED, {
    userId: input.userId,
    ipAddress,
    metadata: {
      orderId: order.id,
      orderNumber: order.orderNumber,
      transactionId: tx.transactionId,
      amount,
      provider,
    },
  });

  if (provider === PaymentProvider.RAZORPAY) {
    const creds = await getRazorpayCredentials(owner.ownerType, owner.ownerId);
    const rzOrder = await createRazorpayOrder(creds, {
      amountPaisa,
      receipt: order.orderNumber,
      notes: {
        orderId: order.id,
        transactionId: tx.transactionId,
        serviceName: input.serviceName.slice(0, 200),
      },
    });

    await updateTransactionStatus(tx.id, TransactionStatus.PENDING, {
      providerTxnId: rzOrder.razorpayOrderId,
      metadata: { razorpayStatus: rzOrder.status },
    });

    return {
      provider: 'RAZORPAY',
      orderId: order.id,
      orderNumber: order.orderNumber,
      transactionId: tx.transactionId,
      amount,
      razorpay: {
        keyId: creds.keyId,
        orderId: rzOrder.razorpayOrderId,
        amount: rzOrder.amount,
        currency: rzOrder.currency,
        name: settings.businessName,
        description: input.serviceName,
        prefill: {},
      },
    };
  }

  const creds = await getPaymentAccountCredentials(owner.ownerType, owner.ownerId);
  const merchantOrderId = order.orderNumber.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 63);
  const callbackUrl = `${env.API_BASE_URL}/api/payments/callback`;
  const redirectUrl = `${callbackUrl}?orderId=${order.id}&txn=${tx.transactionId}`;

  const ppResponse = await initiatePhonePePayment(creds, {
    merchantOrderId,
    amountPaisa,
    redirectUrl,
    message: `InstaHelp: ${input.serviceName}`.slice(0, 100),
    metaInfo: {
      udf1: order.id,
      udf2: tx.transactionId,
      udf3: input.serviceName.slice(0, 256),
    },
  });

  await updateTransactionStatus(tx.id, TransactionStatus.PENDING, {
    providerTxnId: ppResponse.orderId,
    metadata: { phonePeState: ppResponse.state, merchantOrderId },
  });

  return {
    provider: 'PHONEPE',
    orderId: order.id,
    orderNumber: order.orderNumber,
    transactionId: tx.transactionId,
    amount,
    redirectUrl: ppResponse.redirectUrl,
    environment: creds.environment,
  };
}

export async function verifyRazorpayPayment(input: {
  orderId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  userId?: string;
}) {
  const order = await getOrderById(input.orderId);
  const owner = resolveOwner(
    order.vendorId ? OwnerType.VENDOR : OwnerType.ADMIN,
    order.vendorId ?? undefined
  );
  const creds = await getRazorpayCredentials(owner.ownerType, owner.ownerId);

  const valid = verifyRazorpaySignature(
    creds,
    input.razorpayOrderId,
    input.razorpayPaymentId,
    input.razorpaySignature
  );

  if (!valid) {
    await markPaymentFailed(order.id, order.transactions[0]?.id, 'invalid_signature');
    throw new ValidationError('Razorpay payment verification failed');
  }

  const latestTx = order.transactions.find((t) => t.provider === PaymentProvider.RAZORPAY) ?? order.transactions[0];

  await updateOrderPaymentStatus(order.id, PaymentStatus.PAID, OrderStatus.CONFIRMED);
  if (latestTx) {
    await updateTransactionStatus(latestTx.id, TransactionStatus.SUCCESS, {
      providerTxnId: input.razorpayPaymentId,
      paymentMode: 'razorpay',
      metadata: {
        razorpayOrderId: input.razorpayOrderId,
        razorpayPaymentId: input.razorpayPaymentId,
      },
    });
  }

  await logAudit(AuditActions.PAYMENT_SUCCESS, {
    userId: input.userId ?? order.userId ?? undefined,
    metadata: { orderId: order.id, provider: 'RAZORPAY', paymentId: input.razorpayPaymentId },
  });

  const settings = await getAppSettings();
  return {
    verified: true,
    paymentStatus: PaymentStatus.PAID,
    orderNumber: order.orderNumber,
    transactionId: latestTx?.transactionId,
    successUrl: buildRedirectUrl(settings.successUrl),
    failureUrl: buildRedirectUrl(settings.failureUrl),
  };
}

export async function verifyPayment(params: {
  orderId?: string;
  orderNumber?: string;
  merchantTransactionId?: string;
}) {
  let order;
  if (params.orderId) {
    order = await getOrderById(params.orderId);
  } else if (params.orderNumber) {
    order = await getOrderByNumber(params.orderNumber);
  } else {
    throw new ValidationError('orderId or orderNumber is required');
  }

  const owner = resolveOwner(
    order.vendorId ? OwnerType.VENDOR : OwnerType.ADMIN,
    order.vendorId ?? undefined
  );
  const creds = await getPaymentAccountCredentials(owner.ownerType, owner.ownerId);
  const merchantOrderId = order.orderNumber.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 63);

  const status = await getPhonePeOrderStatus(creds, merchantOrderId);
  const latestTx = order.transactions[0];

  const state = (status as { state?: string }).state ?? '';
  const isSuccess = ['COMPLETED', 'SUCCESS', 'PAID'].includes(state.toUpperCase());
  const isFailed = ['FAILED', 'CANCELLED', 'EXPIRED'].includes(state.toUpperCase());

  if (isSuccess && order.paymentStatus !== PaymentStatus.PAID) {
    await markPaymentSuccess(order.id, latestTx?.id, status);
  } else if (isFailed && order.paymentStatus !== PaymentStatus.PAID) {
    await markPaymentFailed(order.id, latestTx?.id, state);
  }

  const updated = await getOrderById(order.id);
  return {
    verified: true,
    paymentStatus: updated.paymentStatus,
    orderStatus: updated.orderStatus,
    phonePeState: state,
    order: updated,
  };
}

export async function getPaymentStatus(orderId: string) {
  const order = await getOrderById(orderId);
  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    paymentStatus: order.paymentStatus,
    orderStatus: order.orderStatus,
    amount: Number(order.amount),
    transactions: order.transactions.map((t) => ({
      transactionId: t.transactionId,
      status: t.status,
      providerTxnId: t.providerTxnId,
    })),
  };
}

async function markPaymentSuccess(
  orderId: string,
  transactionId?: string,
  phonePeData?: unknown
) {
  await updateOrderPaymentStatus(orderId, PaymentStatus.PAID, OrderStatus.CONFIRMED);

  if (transactionId) {
    await updateTransactionStatus(transactionId, TransactionStatus.SUCCESS, {
      metadata: phonePeData as Prisma.InputJsonValue,
    });
  }

  const order = await getOrderById(orderId);
  await logAudit(AuditActions.PAYMENT_SUCCESS, {
    userId: order.userId ?? undefined,
    metadata: { orderId, orderNumber: order.orderNumber },
  });
}

async function markPaymentFailed(
  orderId: string,
  transactionId?: string,
  reason?: string
) {
  await updateOrderPaymentStatus(orderId, PaymentStatus.FAILED, OrderStatus.FAILED);

  if (transactionId) {
    await updateTransactionStatus(transactionId, TransactionStatus.FAILED, {
      failureReason: reason,
    });
  }

  const order = await getOrderById(orderId);
  await logAudit(AuditActions.PAYMENT_FAILURE, {
    userId: order.userId ?? undefined,
    metadata: { orderId, reason },
  });
}

export async function handlePaymentCallback(query: {
  orderId?: string;
  txn?: string;
}) {
  if (!query.orderId) throw new ValidationError('orderId is required');

  const order = await getOrderById(query.orderId);
  const settings = await getAppSettings();

  const verification = await verifyPayment({ orderId: order.id });
  const success = verification.paymentStatus === PaymentStatus.PAID;

  const redirectPath = success ? settings.successUrl : settings.failureUrl;
  const url = new URL(buildRedirectUrl(redirectPath));

  url.searchParams.set('orderId', order.orderNumber);
  if (query.txn) url.searchParams.set('txn', query.txn);
  url.searchParams.set('amount', String(Number(order.amount)));
  url.searchParams.set('service', order.serviceName);

  return { redirectUrl: url.toString(), success };
}

export async function handleWebhook(
  authorization: string,
  rawBody: string,
  ownerType: OwnerType = OwnerType.ADMIN,
  ownerId: string = ADMIN_OWNER_ID
) {
  const creds = await getPaymentAccountCredentials(ownerType, ownerId);
  const callback = validatePhonePeCallback(creds, authorization, rawBody);

  const eventId = `${callback.type}:${(callback.payload as { orderId?: string }).orderId ?? uuidv4()}`;

  const processed = await prisma.processedWebhook.findUnique({ where: { eventId } });
  if (processed) {
    logger.info('Duplicate webhook ignored', { eventId });
    return { duplicate: true };
  }

  await prisma.processedWebhook.create({
    data: {
      eventId,
      eventType: String(callback.type),
      payload: callback.payload as object,
    },
  });

  await logAudit(AuditActions.WEBHOOK_RECEIVED, {
    metadata: { type: callback.type, eventId },
  });

  const payload = callback.payload as {
    originalMerchantOrderId?: string;
    orderId?: string;
    state?: string;
  };

  const orderNumber = payload.originalMerchantOrderId?.replace(/_/g, '-');
  if (!orderNumber) return { processed: false };

  let order;
  try {
    order = await getOrderByNumber(
      orderNumber.includes('IH-') ? orderNumber : orderNumber.replace(/_/g, '-')
    );
  } catch {
    order = await prisma.order.findFirst({
      where: { orderNumber: { contains: orderNumber.slice(-6) } },
      include: { transactions: true },
    });
    if (!order) return { processed: false };
  }

  const state = (payload.state ?? '').toUpperCase();
  const latestTx = order.transactions?.[0];

  if (['COMPLETED', 'SUCCESS', 'PAID'].includes(state)) {
    await markPaymentSuccess(order.id, latestTx?.id, payload);
  } else if (['FAILED', 'CANCELLED', 'EXPIRED'].includes(state)) {
    await markPaymentFailed(order.id, latestTx?.id, state);
  }

  return { processed: true, orderId: order.id };
}

export async function processRefund(input: {
  orderId: string;
  amount?: number;
  reason?: string;
  userId?: string;
}) {
  const order = await getOrderById(input.orderId);
  if (order.paymentStatus !== PaymentStatus.PAID) {
    throw new ValidationError('Only paid orders can be refunded');
  }

  const refundAmount = input.amount ?? Number(order.amount);
  const owner = resolveOwner(
    order.vendorId ? OwnerType.VENDOR : OwnerType.ADMIN,
    order.vendorId ?? undefined
  );
  const creds = await getPaymentAccountCredentials(owner.ownerType, owner.ownerId);
  const merchantOrderId = order.orderNumber.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 63);
  const merchantRefundId = `REF-${uuidv4().slice(0, 8)}`;

  await logAudit(AuditActions.REFUND_REQUESTED, {
    userId: input.userId,
    metadata: { orderId: order.id, amount: refundAmount, reason: input.reason },
  });

  const result = await initiatePhonePeRefund(
    creds,
    merchantOrderId,
    merchantRefundId,
    Math.round(refundAmount * 100)
  );

  await updateOrderPaymentStatus(order.id, PaymentStatus.REFUNDED);

  await logAudit(AuditActions.REFUND_COMPLETED, {
    userId: input.userId,
    metadata: { orderId: order.id, merchantRefundId, result },
  });

  return { success: true, merchantRefundId, result };
}
