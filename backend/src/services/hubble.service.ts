import crypto from 'crypto';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from '../utils/errors';

interface SsoSession {
  userId: string;
  expiresAt: number;
  firstName: string;
  phoneNumber?: string;
}

export interface HubbleUserContext {
  userId: string;
  phoneNumber?: string;
  name?: string;
  email?: string;
  deviceId?: string;
}

const sessions = new Map<string, SsoSession>();
const SESSION_TTL_MS = 15 * 60 * 1000;

let cachedPrivateKey: string | null | undefined;

function cleanupExpiredSessions(): void {
  const now = Date.now();
  for (const [token, session] of sessions) {
    if (session.expiresAt <= now) sessions.delete(token);
  }
}

setInterval(cleanupExpiredSessions, 5 * 60 * 1000).unref();

function normalizePhone(phone?: string): string | undefined {
  if (!phone) return undefined;
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 10) return digits;
  return undefined;
}

function loadPrivateKey(): string | null {
  if (cachedPrivateKey !== undefined) return cachedPrivateKey;

  if (env.HUBBLE_PRIVATE_KEY) {
    cachedPrivateKey = env.HUBBLE_PRIVATE_KEY.replace(/\\n/g, '\n');
  } else if (env.HUBBLE_PRIVATE_KEY_PATH && fs.existsSync(env.HUBBLE_PRIVATE_KEY_PATH)) {
    cachedPrivateKey = fs.readFileSync(env.HUBBLE_PRIVATE_KEY_PATH, 'utf8');
  } else {
    cachedPrivateKey = null;
    return null;
  }

  if (cachedPrivateKey && env.HUBBLE_PUBLIC_KEY) {
    try {
      const probe = crypto.sign('RSA-SHA256', Buffer.from('hubble-key-check'), cachedPrivateKey);
      const publicKey = env.HUBBLE_PUBLIC_KEY.replace(/\\n/g, '\n');
      if (!crypto.verify('RSA-SHA256', Buffer.from('hubble-key-check'), publicKey, probe)) {
        throw new Error('HUBBLE_PRIVATE_KEY does not match HUBBLE_PUBLIC_KEY');
      }
    } catch (err) {
      cachedPrivateKey = null;
      throw err;
    }
  }

  return cachedPrivateKey;
}

export function isHubbleConfigured(): boolean {
  return Boolean(env.HUBBLE_CLIENT_ID && env.HUBBLE_APP_SECRET);
}

export function usesJwtSso(): boolean {
  return Boolean(loadPrivateKey());
}

export function usesClassicSso(): boolean {
  return Boolean(env.HUBBLE_SSO_SECRET);
}

function sdkBaseUrl(): string {
  if (env.HUBBLE_SDK_BASE_URL) {
    return env.HUBBLE_SDK_BASE_URL.endsWith('/')
      ? env.HUBBLE_SDK_BASE_URL
      : `${env.HUBBLE_SDK_BASE_URL}/`;
  }

  return env.HUBBLE_ENV === 'dev'
    ? 'https://sdk.dev.myhubble.money/'
    : 'https://sdk.myhubble.money/';
}

function createClassicSsoToken(user: HubbleUserContext): string {
  const token = crypto.randomBytes(32).toString('base64url');
  sessions.set(token, {
    userId: user.userId,
    expiresAt: Date.now() + SESSION_TTL_MS,
    firstName: user.name?.split(' ')[0] || 'Guest',
    phoneNumber: user.phoneNumber,
  });
  return token;
}

function createJwtSsoToken(user: HubbleUserContext): string {
  const privateKey = loadPrivateKey();
  if (!privateKey) {
    throw new AppError(500, 'Hubble JWT SSO is not configured', 'HUBBLE_JWT_NOT_CONFIGURED');
  }

  const phoneNumber = normalizePhone(user.phoneNumber);
  if (!phoneNumber) {
    throw new AppError(400, 'Phone number is required for gift cards', 'PHONE_REQUIRED');
  }

  const now = Math.floor(Date.now() / 1000);
  const payload: Record<string, unknown> = {
    sub: user.userId,
    iss: env.HUBBLE_CLIENT_ID,
    iat: now,
    exp: now + 60,
    phoneNumber,
  };

  if (user.name) payload.name = user.name;
  if (user.email) payload.email = user.email;

  return jwt.sign(payload, privateKey, { algorithm: 'RS256' });
}

export function resolveSsoToken(user: HubbleUserContext): { token: string; authMode: 'jwt' | 'classic' } {
  if (usesJwtSso()) {
    return { token: createJwtSsoToken(user), authMode: 'jwt' };
  }

  return { token: createClassicSsoToken(user), authMode: 'classic' };
}

export function buildSdkUrl(token: string, deviceId?: string): string {
  const params = new URLSearchParams({
    clientId: env.HUBBLE_CLIENT_ID!,
    appSecret: env.HUBBLE_APP_SECRET!,
  });

  if (token) params.set('token', token);
  if (deviceId) params.set('deviceId', deviceId);
  params.set('appVersion', env.HUBBLE_APP_VERSION || 'web');

  return `${sdkBaseUrl()}?${params.toString()}`;
}

export function prepareSdkSession(user: HubbleUserContext): {
  sdkUrl: string;
  authMode: 'jwt' | 'classic';
} {
  const { token, authMode } = resolveSsoToken(user);
  return {
    sdkUrl: buildSdkUrl(token, user.deviceId),
    authMode,
  };
}

export function verifyHubbleSecret(header: string | undefined): boolean {
  if (!env.HUBBLE_SSO_SECRET) return true;
  return header === env.HUBBLE_SSO_SECRET;
}

export function resolveSsoUser(token: string): {
  userId: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
} | null {
  const session = sessions.get(token);
  if (!session || session.expiresAt <= Date.now()) {
    sessions.delete(token);
    return null;
  }

  return {
    userId: session.userId,
    firstName: session.firstName,
    lastName: 'User',
    phoneNumber: session.phoneNumber,
  };
}
