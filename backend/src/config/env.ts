import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  API_BASE_URL: z.string().url().default('http://localhost:4000'),
  FRONTEND_URL: z.string().default('http://localhost:3000'),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default('7d'),
  ENCRYPTION_KEY: z.string().length(64),
  ADMIN_PHONE: z.string().default('+919999999999'),
  OTP_EXPIRY_MINUTES: z.coerce.number().default(10),
  OTP_DEV_MODE: z
    .string()
    .transform((v) => v === 'true')
    .default('true'),
  PHONEPE_CLIENT_ID: z.string().optional(),
  PHONEPE_CLIENT_SECRET: z.string().optional(),
  PHONEPE_CLIENT_VERSION: z.coerce.number().default(1),
  PHONEPE_ENVIRONMENT: z.enum(['sandbox', 'production']).default('sandbox'),
  PHONEPE_WEBHOOK_USERNAME: z.string().optional(),
  PHONEPE_WEBHOOK_PASSWORD: z.string().optional(),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900_000),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

export const corsOrigins = env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean);

/** Direct db.*.supabase.co:5432 is IPv6-only and fails on Render and most hosts. */
export function assertProductionDatabaseUrl(): void {
  if (env.NODE_ENV !== 'production') return;

  const url = process.env.DATABASE_URL ?? '';
  const directHost = /db\.[a-z0-9]+\.supabase\.co:5432/i.test(url);
  const usesPooler = /\.pooler\.supabase\.com/i.test(url);

  if (directHost && !usesPooler) {
    console.error(
      '\n[InstaHelp] Invalid DATABASE_URL for production.\n' +
        'Use Supabase pooler URLs (see backend/render.env.example).\n' +
        'Do not use db.*.supabase.co:5432 on Render.\n'
    );
    process.exit(1);
  }

  if (!process.env.DIRECT_URL && env.NODE_ENV === 'production') {
    console.error(
      '\n[InstaHelp] DIRECT_URL is required in production for Prisma migrations.\n' +
        'Set it to the Supabase session pooler URL (port 5432).\n'
    );
    process.exit(1);
  }
}
