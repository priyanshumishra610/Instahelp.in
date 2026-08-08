import {
  StandardCheckoutClient,
  Env,
  StandardCheckoutPayRequest,
  RefundRequest,
} from '@phonepe-pg/pg-sdk-node';
import { OwnerType, PaymentProvider } from '@prisma/client';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { decrypt, encrypt } from '../utils/encryption';
import { AppError, NotFoundError } from '../utils/errors';
import { logger } from '../config/logger';

export interface PhonePeCredentials {
  clientId: string;
  clientSecret: string;
  clientVersion: number;
  environment: 'sandbox' | 'production';
  merchantId?: string;
  webhookUsername?: string;
  webhookPassword?: string;
}

const clientCache = new Map<string, StandardCheckoutClient>();

function cacheKey(creds: PhonePeCredentials): string {
  return `${creds.clientId}:${creds.environment}:${creds.clientVersion}`;
}

export function getPhonePeClient(creds: PhonePeCredentials): StandardCheckoutClient {
  const key = cacheKey(creds);
  const existing = clientCache.get(key);
  if (existing) return existing;

  const phonePeEnv = creds.environment === 'production' ? Env.PRODUCTION : Env.SANDBOX;
  const client = StandardCheckoutClient.getInstance(
    creds.clientId,
    creds.clientSecret,
    creds.clientVersion,
    phonePeEnv,
    phonePeEnv === Env.PRODUCTION
  );
  clientCache.set(key, client);
  return client;
}

export async function getPaymentAccountCredentials(
  ownerType: OwnerType,
  ownerId: string
): Promise<PhonePeCredentials> {
  function fromEnv(): PhonePeCredentials | null {
    if (!env.PHONEPE_CLIENT_ID || !env.PHONEPE_CLIENT_SECRET) return null;
    return {
      clientId: env.PHONEPE_CLIENT_ID,
      clientSecret: env.PHONEPE_CLIENT_SECRET,
      clientVersion: env.PHONEPE_CLIENT_VERSION,
      environment: env.PHONEPE_ENVIRONMENT,
      webhookUsername: env.PHONEPE_WEBHOOK_USERNAME,
      webhookPassword: env.PHONEPE_WEBHOOK_PASSWORD,
    };
  }

  // Admin checkout: env vars from Render/host are source of truth (avoids stale DB overrides).
  if (ownerType === OwnerType.ADMIN) {
    const envCreds = fromEnv();
    if (envCreds) return envCreds;
  }

  const account = await prisma.paymentAccount.findFirst({
    where: {
      ownerType,
      ownerId,
      provider: PaymentProvider.PHONEPE,
      isActive: true,
    },
  });

  if (account?.clientId && account.saltKey) {
    try {
      return {
        clientId: account.clientId,
        clientSecret: decrypt(account.saltKey),
        clientVersion: parseInt(account.saltIndex ?? '1', 10) || 1,
        environment: account.environment as 'sandbox' | 'production',
        merchantId: account.merchantId ?? undefined,
        webhookUsername: account.webhookUser ? decrypt(account.webhookUser) : undefined,
        webhookPassword: account.webhookPass ? decrypt(account.webhookPass) : undefined,
      };
    } catch (err) {
      logger.error('Failed to decrypt PhonePe credentials from database; falling back to env', {
        ownerType,
        ownerId,
        err,
      });
    }
  }

  const envCreds = fromEnv();
  if (envCreds) return envCreds;

  throw new NotFoundError(
    'PhonePe payment account not configured. Set credentials in admin payment settings.'
  );
}

export async function upsertPaymentAccount(
  ownerType: OwnerType,
  ownerId: string,
  data: {
    merchantId?: string;
    clientId?: string;
    clientSecret?: string;
    clientVersion?: string | number;
    saltKey?: string;
    saltIndex?: string;
    environment?: string;
    webhookUsername?: string;
    webhookPassword?: string;
    isActive?: boolean;
  }
) {
  const secret = data.clientSecret ?? data.saltKey;
  const version = String(data.clientVersion ?? data.saltIndex ?? '1');

  const payload = {
    merchantId: data.merchantId,
    clientId: data.clientId,
    saltKey: secret ? encrypt(secret) : undefined,
    saltIndex: version,
    environment: data.environment ?? env.PHONEPE_ENVIRONMENT ?? 'production',
    webhookUser: data.webhookUsername ? encrypt(data.webhookUsername) : undefined,
    webhookPass: data.webhookPassword ? encrypt(data.webhookPassword) : undefined,
    isActive: data.isActive ?? true,
  };

  return prisma.paymentAccount.upsert({
    where: {
      ownerType_ownerId_provider: {
        ownerType,
        ownerId,
        provider: PaymentProvider.PHONEPE,
      },
    },
    create: {
      ownerType,
      ownerId,
      provider: PaymentProvider.PHONEPE,
      ...payload,
    },
    update: {
      ...Object.fromEntries(
        Object.entries(payload).filter(([, v]) => v !== undefined)
      ),
    },
  });
}

export interface InitiatePaymentInput {
  merchantOrderId: string;
  amountPaisa: number;
  redirectUrl: string;
  message?: string;
  metaInfo?: Record<string, string>;
}

export async function initiatePhonePePayment(
  creds: PhonePeCredentials,
  input: InitiatePaymentInput
) {
  const client = getPhonePeClient(creds);

  const builder = StandardCheckoutPayRequest.builder()
    .merchantOrderId(input.merchantOrderId)
    .amount(input.amountPaisa)
    .redirectUrl(input.redirectUrl);

  if (input.message) {
    builder.message(input.message);
  }

  const request = builder.build();

  try {
    const response = await client.pay(request);
    return {
      redirectUrl: response.redirectUrl,
      orderId: response.orderId,
      state: response.state,
      expireAt: response.expireAt,
    };
  } catch (err: unknown) {
    const pe = err as {
      message?: string;
      code?: string;
      httpStatusCode?: number;
      type?: string;
    };
    logger.error('PhonePe pay() failed', {
      err,
      merchantOrderId: input.merchantOrderId,
      environment: creds.environment,
      phonePeCode: pe.code,
      phonePeMessage: pe.message,
    });

    if (pe.httpStatusCode === 401 || pe.code === '401') {
      if (pe.code === 'BLOCKED_MERCHANT') {
        throw new AppError(
          502,
          creds.environment === 'production'
            ? 'PhonePe merchant is not live yet. Your credentials are valid, but PhonePe has not activated production checkout for this merchant. Complete KYC and merchant activation in the PhonePe Business dashboard, or switch to sandbox credentials with PHONEPE_ENVIRONMENT=sandbox for testing.'
            : 'PhonePe sandbox merchant is blocked or inactive. Regenerate sandbox credentials in the PhonePe Business dashboard with Test Mode enabled.',
          'PHONEPE_MERCHANT_BLOCKED'
        );
      }

      throw new AppError(
        502,
        creds.environment === 'sandbox'
          ? 'PhonePe auth failed. Sandbox credentials require PHONEPE_ENVIRONMENT=sandbox. Live credentials require production.'
          : pe.message ??
              'PhonePe auth failed. Verify Client ID, Client Secret, and Client Version match your PhonePe dashboard environment.',
        'PHONEPE_UNAUTHORIZED'
      );
    }

    throw new AppError(502, pe.message ?? 'PhonePe payment initiation failed', 'PHONEPE_ERROR');
  }
}

export async function getPhonePeOrderStatus(
  creds: PhonePeCredentials,
  merchantOrderId: string
) {
  const client = getPhonePeClient(creds);
  try {
    return await client.getOrderStatus(merchantOrderId);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch order status';
    logger.error('PhonePe getOrderStatus failed', { err, merchantOrderId });
    throw new AppError(502, message, 'PHONEPE_ERROR');
  }
}

export async function initiatePhonePeRefund(
  creds: PhonePeCredentials,
  merchantOrderId: string,
  merchantRefundId: string,
  amountPaisa: number
) {
  const client = getPhonePeClient(creds);
  const request = RefundRequest.builder()
    .originalMerchantOrderId(merchantOrderId)
    .merchantRefundId(merchantRefundId)
    .amount(amountPaisa)
    .build();

  try {
    return await client.refund(request);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Refund initiation failed';
    logger.error('PhonePe refund failed', { err, merchantOrderId });
    throw new AppError(502, message, 'PHONEPE_ERROR');
  }
}

export function validatePhonePeCallback(
  creds: PhonePeCredentials,
  authorization: string,
  body: string
) {
  const client = getPhonePeClient(creds);
  if (!creds.webhookUsername || !creds.webhookPassword) {
    throw new AppError(500, 'Webhook credentials not configured', 'WEBHOOK_CONFIG');
  }
  return client.validateCallback(
    creds.webhookUsername,
    creds.webhookPassword,
    authorization,
    body
  );
}
