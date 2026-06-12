import bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { generateOtp, normalizePhone } from '../utils/sanitize';
import { ValidationError, UnauthorizedError } from '../utils/errors';
import { signToken } from '../middleware/auth';
import { logAudit, AuditActions } from './audit.service';

export async function sendOtp(phone: string, ipAddress?: string) {
  const normalized = normalizePhone(phone);
  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + env.OTP_EXPIRY_MINUTES * 60 * 1000);

  await prisma.otpSession.create({
    data: { phone: normalized, otpHash, expiresAt },
  });

  if (env.OTP_DEV_MODE) {
    logger.info(`[DEV OTP] ${normalized}: ${otp}`);
  }

  await logAudit(AuditActions.OTP_SENT, {
    metadata: { phone: normalized.slice(-4).padStart(normalized.length, '*') },
    ipAddress,
  });

  return {
    message: env.OTP_DEV_MODE
      ? `OTP sent (dev mode: check server logs). Expires in ${env.OTP_EXPIRY_MINUTES} minutes.`
      : 'OTP sent successfully',
    phone: normalized,
    devOtp: env.OTP_DEV_MODE ? otp : undefined,
  };
}

export async function verifyOtp(
  phone: string,
  otp: string,
  name?: string,
  email?: string,
  ipAddress?: string
) {
  const normalized = normalizePhone(phone);

  const session = await prisma.otpSession.findFirst({
    where: {
      phone: normalized,
      verified: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!session) {
    throw new ValidationError('OTP expired or not found. Please request a new OTP.');
  }

  if (session.attempts >= 5) {
    throw new ValidationError('Too many failed attempts. Please request a new OTP.');
  }

  const valid = await bcrypt.compare(otp, session.otpHash);
  if (!valid) {
    await prisma.otpSession.update({
      where: { id: session.id },
      data: { attempts: { increment: 1 } },
    });
    throw new ValidationError('Invalid OTP');
  }

  await prisma.otpSession.update({
    where: { id: session.id },
    data: { verified: true },
  });

  const adminPhone = normalizePhone(env.ADMIN_PHONE);
  const isAdmin = normalized === adminPhone;

  let user = await prisma.user.findUnique({ where: { phone: normalized } });

  if (!user) {
    user = await prisma.user.create({
      data: {
        phone: normalized,
        name: name ?? undefined,
        email: email ?? undefined,
        role: isAdmin ? UserRole.ADMIN : UserRole.USER,
      },
    });
  } else if (name || email) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: name ?? user.name,
        email: email ?? user.email,
        role: isAdmin ? UserRole.ADMIN : user.role,
      },
    });
  }

  const token = signToken({
    userId: user.id,
    phone: user.phone,
    role: user.role,
  });

  await logAudit(AuditActions.OTP_VERIFIED, { userId: user.id, ipAddress });

  return {
    token,
    user: {
      id: user.id,
      phone: user.phone,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    },
  };
}

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      phone: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  if (!user) throw new UnauthorizedError('User not found');
  return user;
}
