-- AlterEnum
ALTER TYPE "PaymentProvider" ADD VALUE 'RAZORPAY';

-- AlterTable
ALTER TABLE "app_settings" ADD COLUMN IF NOT EXISTS "razorpayEnabled" BOOLEAN NOT NULL DEFAULT true;
