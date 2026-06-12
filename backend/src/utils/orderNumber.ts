import { prisma } from '../config/database';

export async function generateOrderNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `IH-${year}-`;

  const latest = await prisma.order.findFirst({
    where: { orderNumber: { startsWith: prefix } },
    orderBy: { createdAt: 'desc' },
    select: { orderNumber: true },
  });

  let next = 1;
  if (latest?.orderNumber) {
    const parts = latest.orderNumber.split('-');
    const lastNum = parseInt(parts[parts.length - 1] ?? '0', 10);
    if (!Number.isNaN(lastNum)) next = lastNum + 1;
  }

  return `${prefix}${String(next).padStart(6, '0')}`;
}

export function generateTransactionRef(): string {
  const year = new Date().getFullYear();
  const rand = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `TXN-${year}-${rand}`;
}
