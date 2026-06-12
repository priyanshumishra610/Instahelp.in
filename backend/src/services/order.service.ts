import { Decimal } from '@prisma/client/runtime/library';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { NotFoundError, ConflictError } from '../utils/errors';
import { generateOrderNumber } from '../utils/orderNumber';
import { logAudit, AuditActions } from './audit.service';

const CONVENIENCE_FEE_RATE = 0.02;
const GST_RATE = 0.18;

export interface CreateOrderInput {
  serviceName: string;
  vendorName?: string;
  vendorId?: string;
  quantity: number;
  price: number;
  discount?: number;
  applyGst?: boolean;
  userId?: string;
  idempotencyKey?: string;
}

export function calculateOrderTotals(input: {
  price: number;
  quantity: number;
  discount?: number;
  applyGst?: boolean;
}) {
  const subtotal = input.price * input.quantity;
  const discount = Math.min(input.discount ?? 0, subtotal);
  const afterDiscount = Math.max(0, subtotal - discount);
  const convenienceFee = Math.round(afterDiscount * CONVENIENCE_FEE_RATE);
  const gst =
    input.applyGst !== false ? Math.round(convenienceFee * GST_RATE) : 0;
  const grandTotal = afterDiscount + convenienceFee + gst;

  return { subtotal, discount, convenienceFee, gst, grandTotal };
}

export async function createOrder(input: CreateOrderInput) {
  if (input.idempotencyKey) {
    const existing = await prisma.order.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
      include: { transactions: true },
    });
    if (existing) return existing;
  }

  const totals = calculateOrderTotals(input);
  const orderNumber = await generateOrderNumber();

  let vendorName = input.vendorName;
  if (input.vendorId) {
    const vendor = await prisma.vendor.findUnique({ where: { id: input.vendorId } });
    if (vendor) vendorName = vendor.shopName;
  }

  const order = await prisma.order.create({
    data: {
      orderNumber,
      userId: input.userId,
      vendorId: input.vendorId,
      serviceName: input.serviceName,
      vendorName,
      quantity: input.quantity,
      subtotal: new Decimal(totals.subtotal),
      discount: new Decimal(totals.discount),
      convenienceFee: new Decimal(totals.convenienceFee),
      gst: new Decimal(totals.gst),
      amount: new Decimal(totals.grandTotal),
      paymentStatus: PaymentStatus.PENDING,
      orderStatus: OrderStatus.PENDING,
      idempotencyKey: input.idempotencyKey,
    },
    include: { transactions: true },
  });

  await logAudit(AuditActions.ORDER_CREATED, {
    userId: input.userId,
    metadata: { orderId: order.id, orderNumber: order.orderNumber },
  });

  return order;
}

export async function getOrderById(id: string, userId?: string) {
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      transactions: { orderBy: { createdAt: 'desc' } },
      vendor: { select: { id: true, shopName: true, status: true } },
    },
  });

  if (!order) throw new NotFoundError('Order not found');
  if (userId && order.userId && order.userId !== userId) {
    throw new NotFoundError('Order not found');
  }

  return order;
}

export async function getOrderByNumber(orderNumber: string) {
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: { transactions: { orderBy: { createdAt: 'desc' } } },
  });
  if (!order) throw new NotFoundError('Order not found');
  return order;
}

export async function getUserOrders(userId: string) {
  return prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: { transactions: { take: 1, orderBy: { createdAt: 'desc' } } },
  });
}

export async function updateOrderPaymentStatus(
  orderId: string,
  paymentStatus: PaymentStatus,
  orderStatus?: OrderStatus
) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new NotFoundError('Order not found');

  if (order.paymentStatus === PaymentStatus.PAID && paymentStatus === PaymentStatus.PAID) {
    throw new ConflictError('Order is already paid');
  }

  return prisma.order.update({
    where: { id: orderId },
    data: {
      paymentStatus,
      orderStatus: orderStatus ?? order.orderStatus,
    },
  });
}

export function serializeOrder(order: Awaited<ReturnType<typeof getOrderById>>) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    serviceName: order.serviceName,
    vendorName: order.vendorName,
    quantity: order.quantity,
    subtotal: Number(order.subtotal),
    discount: Number(order.discount),
    convenienceFee: Number(order.convenienceFee),
    gst: Number(order.gst),
    amount: Number(order.amount),
    paymentStatus: order.paymentStatus,
    orderStatus: order.orderStatus,
    createdAt: order.createdAt,
    transactions: order.transactions?.map((t) => ({
      id: t.id,
      transactionId: t.transactionId,
      status: t.status,
      amount: Number(t.amount),
      createdAt: t.createdAt,
    })),
    vendor: order.vendor,
  };
}
