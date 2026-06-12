import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { logger } from '../config/logger';

export const AuditActions = {
  PAYMENT_INITIATED: 'PAYMENT_INITIATED',
  PAYMENT_SUCCESS: 'PAYMENT_SUCCESS',
  PAYMENT_FAILURE: 'PAYMENT_FAILURE',
  REFUND_REQUESTED: 'REFUND_REQUESTED',
  REFUND_COMPLETED: 'REFUND_COMPLETED',
  VENDOR_UPDATED: 'VENDOR_UPDATED',
  ADMIN_UPDATED_CREDENTIALS: 'ADMIN_UPDATED_CREDENTIALS',
  OTP_SENT: 'OTP_SENT',
  OTP_VERIFIED: 'OTP_VERIFIED',
  ORDER_CREATED: 'ORDER_CREATED',
  WEBHOOK_RECEIVED: 'WEBHOOK_RECEIVED',
} as const;

export type AuditAction = (typeof AuditActions)[keyof typeof AuditActions];

export async function logAudit(
  action: AuditAction,
  options: {
    userId?: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
  } = {}
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        userId: options.userId,
        metadata: (options.metadata ?? {}) as Prisma.InputJsonValue,
        ipAddress: options.ipAddress,
      },
    });
  } catch (err) {
    logger.error('Failed to write audit log', { action, err });
  }
}
