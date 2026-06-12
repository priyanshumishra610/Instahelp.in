import { PaymentProvider, Prisma, TransactionStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { NotFoundError } from '../utils/errors';
import { generateTransactionRef } from '../utils/orderNumber';

export async function createTransaction(
  orderId: string,
  amount: number,
  provider: PaymentProvider = PaymentProvider.PHONEPE
) {
  return prisma.transaction.create({
    data: {
      orderId,
      transactionId: generateTransactionRef(),
      amount,
      provider,
      status: TransactionStatus.PENDING,
    },
  });
}

export async function getTransactionById(id: string) {
  const tx = await prisma.transaction.findUnique({
    where: { id },
    include: { order: true },
  });
  if (!tx) throw new NotFoundError('Transaction not found');
  return tx;
}

export async function getTransactionByRef(transactionId: string) {
  const tx = await prisma.transaction.findUnique({
    where: { transactionId },
    include: { order: true },
  });
  if (!tx) throw new NotFoundError('Transaction not found');
  return tx;
}

export async function getAllTransactions(filters?: { status?: TransactionStatus; userId?: string }) {
  return prisma.transaction.findMany({
    where: {
      status: filters?.status,
      order: filters?.userId ? { userId: filters.userId } : undefined,
    },
    orderBy: { createdAt: 'desc' },
    include: {
      order: {
        select: {
          orderNumber: true,
          serviceName: true,
          vendorName: true,
          userId: true,
        },
      },
    },
    take: 100,
  });
}

export async function updateTransactionStatus(
  id: string,
  status: TransactionStatus,
  extra?: {
    providerTxnId?: string;
    paymentMode?: string;
    failureReason?: string;
    metadata?: Prisma.InputJsonValue;
  }
) {
  return prisma.transaction.update({
    where: { id },
    data: {
      status,
      providerTxnId: extra?.providerTxnId,
      paymentMode: extra?.paymentMode,
      failureReason: extra?.failureReason,
      metadata: extra?.metadata as Prisma.InputJsonValue | undefined,
    },
  });
}

export function serializeTransaction(tx: Awaited<ReturnType<typeof getTransactionById>>) {
  return {
    id: tx.id,
    transactionId: tx.transactionId,
    orderId: tx.orderId,
    orderNumber: tx.order?.orderNumber,
    providerTxnId: tx.providerTxnId,
    provider: tx.provider,
    amount: Number(tx.amount),
    status: tx.status,
    paymentMode: tx.paymentMode,
    failureReason: tx.failureReason,
    service: tx.order?.serviceName,
    vendor: tx.order?.vendorName,
    createdAt: tx.createdAt,
    updatedAt: tx.updatedAt,
  };
}
