import Razorpay from 'razorpay';
import crypto from 'crypto';
import { OwnerType, PaymentProvider } from '@prisma/client';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { decrypt, encrypt } from '../utils/encryption';
import { AppError, NotFoundError } from '../utils/errors';
import { logger } from '../config/logger';

export interface RazorpayCredentials {
  keyId: string;
  keySecret: string;
}

const clientCache = new Map<string, Razorpay>();

export function getRazorpayClient(creds: RazorpayCredentials): Razorpay {
  const existing = clientCache.get(creds.keyId);
  if (existing) return existing;

  const client = new Razorpay({
    key_id: creds.keyId,
    key_secret: creds.keySecret,
  });
  clientCache.set(creds.keyId, client);
  return client;
}

export async function getRazorpayCredentials(
  ownerType: OwnerType,
  ownerId: string
): Promise<RazorpayCredentials> {
  const account = await prisma.paymentAccount.findFirst({
    where: {
      ownerType,
      ownerId,
      provider: PaymentProvider.RAZORPAY,
      isActive: true,
    },
  });

  if (account?.clientId && account.saltKey) {
    return {
      keyId: account.clientId,
      keySecret: decrypt(account.saltKey),
    };
  }

  if (env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET) {
    return {
      keyId: env.RAZORPAY_KEY_ID,
      keySecret: env.RAZORPAY_KEY_SECRET,
    };
  }

  throw new NotFoundError(
    'Razorpay account not configured. Set credentials in environment or admin settings.'
  );
}

export async function upsertRazorpayAccount(
  ownerType: OwnerType,
  ownerId: string,
  data: {
    keyId?: string;
    keySecret?: string;
    isActive?: boolean;
  }
) {
  return prisma.paymentAccount.upsert({
    where: {
      ownerType_ownerId_provider: {
        ownerType,
        ownerId,
        provider: PaymentProvider.RAZORPAY,
      },
    },
    create: {
      ownerType,
      ownerId,
      provider: PaymentProvider.RAZORPAY,
      clientId: data.keyId,
      saltKey: data.keySecret ? encrypt(data.keySecret) : undefined,
      environment: 'production',
      isActive: data.isActive ?? true,
    },
    update: {
      clientId: data.keyId,
      saltKey: data.keySecret ? encrypt(data.keySecret) : undefined,
      isActive: data.isActive ?? true,
    },
  });
}

export async function createRazorpayOrder(
  creds: RazorpayCredentials,
  input: {
    amountPaisa: number;
    receipt: string;
    notes?: Record<string, string>;
  }
) {
  const client = getRazorpayClient(creds);

  try {
    const order = await client.orders.create({
      amount: input.amountPaisa,
      currency: 'INR',
      receipt: input.receipt.slice(0, 40),
      notes: input.notes,
    });

    return {
      razorpayOrderId: order.id,
      amount: order.amount,
      currency: order.currency,
      status: order.status,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Razorpay order creation failed';
    logger.error('Razorpay orders.create failed', { err, receipt: input.receipt });
    throw new AppError(502, message, 'RAZORPAY_ERROR');
  }
}

export function verifyRazorpaySignature(
  creds: RazorpayCredentials,
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string
): boolean {
  const body = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expected = crypto.createHmac('sha256', creds.keySecret).update(body).digest('hex');
  return expected === razorpaySignature;
}
