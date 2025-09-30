-- CreateEnum
CREATE TYPE "public"."PaymentMethod" AS ENUM ('CARD', 'PAYPAL', 'APPLE_PAY', 'GOOGLE_PAY');

-- AlterTable
ALTER TABLE "public"."orders" ADD COLUMN     "paymentError" TEXT,
ADD COLUMN     "paymentMethod" TEXT,
ADD COLUMN     "stripeCustomerId" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
