import { OwnerType, PaymentStatus, VendorStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { maskSecret } from '../utils/encryption';
import { upsertPaymentAccount } from './phonepe.service';
import { logAudit, AuditActions } from './audit.service';

const ADMIN_OWNER_ID = 'platform';

export async function getDashboardStats() {
  const [
    totalOrders,
    paidOrders,
    pendingOrders,
    failedOrders,
    totalVendors,
    activeVendors,
    totalRevenue,
    recentOrders,
  ] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({ where: { paymentStatus: PaymentStatus.PAID } }),
    prisma.order.count({ where: { paymentStatus: PaymentStatus.PENDING } }),
    prisma.order.count({ where: { paymentStatus: PaymentStatus.FAILED } }),
    prisma.vendor.count(),
    prisma.vendor.count({ where: { status: VendorStatus.ACTIVE } }),
    prisma.order.aggregate({
      where: { paymentStatus: PaymentStatus.PAID },
      _sum: { amount: true },
    }),
    prisma.order.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        orderNumber: true,
        serviceName: true,
        amount: true,
        paymentStatus: true,
        createdAt: true,
      },
    }),
  ]);

  return {
    orders: {
      total: totalOrders,
      paid: paidOrders,
      pending: pendingOrders,
      failed: failedOrders,
    },
    vendors: { total: totalVendors, active: activeVendors },
    revenue: Number(totalRevenue._sum.amount ?? 0),
    recentOrders: recentOrders.map((o) => ({
      ...o,
      amount: Number(o.amount),
    })),
  };
}

export async function getAdminOrders(page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { transactions: { take: 1, orderBy: { createdAt: 'desc' } } },
    }),
    prisma.order.count(),
  ]);

  return {
    orders: orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      serviceName: o.serviceName,
      vendorName: o.vendorName,
      amount: Number(o.amount),
      paymentStatus: o.paymentStatus,
      orderStatus: o.orderStatus,
      createdAt: o.createdAt,
      transaction: o.transactions[0]
        ? {
            transactionId: o.transactions[0].transactionId,
            status: o.transactions[0].status,
          }
        : null,
    })),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}

export async function getAdminVendors() {
  return prisma.vendor.findMany({ orderBy: { createdAt: 'desc' } });
}

export async function getAdminTransactions(page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        order: {
          select: { orderNumber: true, serviceName: true, vendorName: true },
        },
      },
    }),
    prisma.transaction.count(),
  ]);

  return {
    transactions: transactions.map((t) => ({
      id: t.id,
      transactionId: t.transactionId,
      orderNumber: t.order.orderNumber,
      service: t.order.serviceName,
      vendor: t.order.vendorName,
      amount: Number(t.amount),
      status: t.status,
      providerTxnId: t.providerTxnId,
      createdAt: t.createdAt,
    })),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}

export async function getPaymentSettings() {
  const settings = await prisma.appSettings.upsert({
    where: { id: 'default' },
    create: {},
    update: {},
  });

  const account = await prisma.paymentAccount.findFirst({
    where: {
      ownerType: OwnerType.ADMIN,
      ownerId: ADMIN_OWNER_ID,
    },
  });

  return {
    businessName: settings.businessName,
    supportEmail: settings.supportEmail,
    supportNumber: settings.supportNumber,
    paymentsEnabled: settings.paymentsEnabled,
    phonepeEnabled: settings.phonepeEnabled,
    successUrl: settings.successUrl,
    failureUrl: settings.failureUrl,
    phonepe: {
      environment: account?.environment ?? 'sandbox',
      merchantId: account?.merchantId ?? '',
      clientId: account?.clientId ? maskSecret(account.clientId, 6) : '',
      clientSecretConfigured: !!account?.saltKey,
      clientVersion: account?.saltIndex ?? '1',
      saltIndex: account?.saltIndex ?? '1',
      webhookConfigured: !!(account?.webhookUser && account?.webhookPass),
      isActive: account?.isActive ?? false,
    },
  };
}

export async function updatePaymentSettings(
  data: {
    businessName?: string;
    supportEmail?: string;
    supportNumber?: string;
    paymentsEnabled?: boolean;
    phonepeEnabled?: boolean;
    successUrl?: string;
    failureUrl?: string;
    environment?: string;
    merchantId?: string;
    clientId?: string;
    clientSecret?: string;
    clientVersion?: string | number;
    saltKey?: string;
    saltIndex?: string;
    webhookUsername?: string;
    webhookPassword?: string;
    ownerType?: OwnerType;
    ownerId?: string;
  },
  userId?: string
) {
  const settingsUpdate: Record<string, unknown> = {};
  if (data.businessName !== undefined) settingsUpdate.businessName = data.businessName;
  if (data.supportEmail !== undefined) settingsUpdate.supportEmail = data.supportEmail;
  if (data.supportNumber !== undefined) settingsUpdate.supportNumber = data.supportNumber;
  if (data.paymentsEnabled !== undefined) settingsUpdate.paymentsEnabled = data.paymentsEnabled;
  if (data.phonepeEnabled !== undefined) settingsUpdate.phonepeEnabled = data.phonepeEnabled;
  if (data.successUrl !== undefined) settingsUpdate.successUrl = data.successUrl;
  if (data.failureUrl !== undefined) settingsUpdate.failureUrl = data.failureUrl;

  if (Object.keys(settingsUpdate).length > 0) {
    await prisma.appSettings.upsert({
      where: { id: 'default' },
      create: settingsUpdate,
      update: settingsUpdate,
    });
  }

  const ownerType = data.ownerType ?? OwnerType.ADMIN;
  const ownerId = data.ownerId ?? ADMIN_OWNER_ID;

  const hasCreds =
    data.clientId ||
    data.clientSecret ||
    data.saltKey ||
    data.merchantId ||
    data.environment;

  if (hasCreds) {
    await upsertPaymentAccount(ownerType, ownerId, {
      merchantId: data.merchantId,
      clientId: data.clientId,
      clientSecret: data.clientSecret,
      clientVersion: data.clientVersion ?? data.saltIndex,
      saltKey: data.saltKey ?? data.clientSecret,
      saltIndex: String(data.saltIndex ?? data.clientVersion ?? '1'),
      environment: data.environment,
      webhookUsername: data.webhookUsername,
      webhookPassword: data.webhookPassword,
      isActive: true,
    });
  }

  await logAudit(AuditActions.ADMIN_UPDATED_CREDENTIALS, {
    userId,
    metadata: {
      ownerType,
      ownerId,
      fieldsUpdated: Object.keys(data).filter(
        (k) => !['clientSecret', 'saltKey', 'webhookPassword'].includes(k)
      ),
    },
  });

  return getPaymentSettings();
}
