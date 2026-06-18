import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import * as hubbleService from '../services/hubble.service';
import { AppError } from '../utils/errors';

function normalizePhone(phone?: string): string | undefined {
  if (!phone) return undefined;
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 10) return digits;
  return undefined;
}

function buildUserContext(req: Request): hubbleService.HubbleUserContext {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const phoneFromBody = normalizePhone(typeof body.phoneNumber === 'string' ? body.phoneNumber : undefined);
  const phoneFromUser = normalizePhone(req.user?.phone);
  const deviceId =
    typeof body.deviceId === 'string' && body.deviceId.trim()
      ? body.deviceId.trim().slice(0, 128)
      : undefined;

  const userId = req.user?.userId || `web_${cryptoRandomId()}`;
  const phoneNumber = phoneFromUser || phoneFromBody;

  return {
    userId,
    phoneNumber,
    name: typeof body.name === 'string' ? body.name.trim().slice(0, 120) : undefined,
    email: typeof body.email === 'string' ? body.email.trim().slice(0, 160) : undefined,
    deviceId,
  };
}

function cryptoRandomId(): string {
  return crypto.randomBytes(6).toString('hex');
}

export async function initSdk(req: Request, res: Response, next: NextFunction) {
  try {
    if (!hubbleService.isHubbleConfigured()) {
      throw new AppError(503, 'Gift cards are not configured', 'HUBBLE_NOT_CONFIGURED');
    }

    const user = buildUserContext(req);
    const { sdkUrl, authMode } = hubbleService.prepareSdkSession(user);

    res.json({
      success: true,
      data: {
        sdkUrl,
        authMode,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function ssoCallback(req: Request, res: Response, next: NextFunction) {
  try {
    if (!hubbleService.verifyHubbleSecret(req.header('X-Hubble-Secret'))) {
      res.status(401).json({ userId: null });
      return;
    }

    const token = typeof req.body?.token === 'string' ? req.body.token : '';
    const user = hubbleService.resolveSsoUser(token);

    if (!user) {
      res.status(401).json({ userId: null });
      return;
    }

    res.json({
      userId: user.userId,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
    });
  } catch (err) {
    next(err);
  }
}
