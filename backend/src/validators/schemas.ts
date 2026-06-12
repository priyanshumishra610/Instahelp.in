import { z } from 'zod';

export const sendOtpSchema = z.object({
  phone: z.string().min(10).max(15),
});

export const verifyOtpSchema = z.object({
  phone: z.string().min(10).max(15),
  otp: z.string().length(6),
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
});

export const createOrderSchema = z.object({
  serviceName: z.string().min(1).max(200),
  vendorName: z.string().min(1).max(200).optional(),
  vendorId: z.string().uuid().optional(),
  quantity: z.number().int().min(1).max(100).default(1),
  price: z.number().positive(),
  discount: z.number().min(0).default(0),
  applyGst: z.boolean().default(true),
  idempotencyKey: z.string().max(100).optional(),
});

export const createPaymentSchema = z.object({
  serviceName: z.string().min(1).max(200),
  vendorName: z.string().min(1).max(200).optional(),
  vendorId: z.string().uuid().optional(),
  quantity: z.number().int().min(1).max(100).default(1),
  price: z.number().positive(),
  discount: z.number().min(0).default(0),
  applyGst: z.boolean().default(true),
  idempotencyKey: z.string().max(100).optional(),
  ownerType: z.enum(['ADMIN', 'VENDOR']).default('ADMIN'),
  provider: z.enum(['PHONEPE', 'RAZORPAY']).default('PHONEPE'),
});

export const verifyRazorpaySchema = z.object({
  orderId: z.string().uuid(),
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});

export const verifyPaymentSchema = z.object({
  orderId: z.string().uuid().optional(),
  orderNumber: z.string().optional(),
  merchantTransactionId: z.string().optional(),
});

export const refundSchema = z.object({
  orderId: z.string().uuid(),
  amount: z.number().positive().optional(),
  reason: z.string().max(500).optional(),
});

export const vendorRegisterSchema = z.object({
  shopName: z.string().min(2).max(200),
  ownerName: z.string().min(2).max(100),
  phone: z.string().min(10).max(15),
  email: z.string().email().optional(),
});

export const vendorUpdateSchema = z.object({
  shopName: z.string().min(2).max(200).optional(),
  ownerName: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  status: z.enum(['PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED']).optional(),
});

export const paymentSettingsSchema = z.object({
  businessName: z.string().min(1).max(100).optional(),
  supportEmail: z.string().email().optional(),
  supportNumber: z.string().max(20).optional(),
  paymentsEnabled: z.boolean().optional(),
  phonepeEnabled: z.boolean().optional(),
  razorpayEnabled: z.boolean().optional(),
  razorpayKeyId: z.string().max(200).optional(),
  razorpayKeySecret: z.string().max(500).optional(),
  successUrl: z.string().max(500).optional(),
  failureUrl: z.string().max(500).optional(),
  environment: z.enum(['sandbox', 'production']).optional(),
  merchantId: z.string().max(100).optional(),
  clientId: z.string().max(200).optional(),
  clientSecret: z.string().max(500).optional(),
  clientVersion: z.union([z.string(), z.number()]).optional(),
  saltKey: z.string().max(500).optional(),
  saltIndex: z.string().max(10).optional(),
  webhookUsername: z.string().max(100).optional(),
  webhookPassword: z.string().max(200).optional(),
  ownerType: z.enum(['ADMIN', 'VENDOR']).default('ADMIN'),
  ownerId: z.string().optional(),
});
