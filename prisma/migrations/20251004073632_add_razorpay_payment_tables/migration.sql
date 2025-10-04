/*
  Warnings:

  - You are about to drop the column `stripePaymentIntentId` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `stripeSessionId` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `stripeCustomerId` on the `users` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[razorpayOrderId]` on the table `orders` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[razorpayPaymentId]` on the table `orders` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[razorpayCustomerId]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "public"."RefundStatus" AS ENUM ('PENDING', 'PROCESSED', 'FAILED');

-- DropIndex
DROP INDEX "public"."orders_stripePaymentIntentId_key";

-- DropIndex
DROP INDEX "public"."orders_stripeSessionId_key";

-- DropIndex
DROP INDEX "public"."users_stripeCustomerId_key";

-- AlterTable
ALTER TABLE "public"."orders" DROP COLUMN "stripePaymentIntentId",
DROP COLUMN "stripeSessionId",
ADD COLUMN     "razorpayOrderId" TEXT,
ADD COLUMN     "razorpayPaymentId" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "public"."users" DROP COLUMN "stripeCustomerId",
ADD COLUMN     "razorpayCustomerId" TEXT;

-- DropEnum
DROP TYPE "public"."PaymentMethod";

-- CreateTable
CREATE TABLE "public"."payment_logs" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "paymentId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" TEXT NOT NULL,
    "gateway" TEXT NOT NULL DEFAULT 'RAZORPAY',
    "errorMessage" TEXT,
    "rawResponse" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."refunds" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "refundId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "public"."RefundStatus" NOT NULL,
    "reason" TEXT,
    "processedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."_PaymentLogToUser" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_PaymentLogToUser_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_logs_paymentId_key" ON "public"."payment_logs"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "refunds_refundId_key" ON "public"."refunds"("refundId");

-- CreateIndex
CREATE INDEX "_PaymentLogToUser_B_index" ON "public"."_PaymentLogToUser"("B");

-- CreateIndex
CREATE UNIQUE INDEX "orders_razorpayOrderId_key" ON "public"."orders"("razorpayOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "orders_razorpayPaymentId_key" ON "public"."orders"("razorpayPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "users_razorpayCustomerId_key" ON "public"."users"("razorpayCustomerId");

-- AddForeignKey
ALTER TABLE "public"."payment_logs" ADD CONSTRAINT "payment_logs_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."refunds" ADD CONSTRAINT "refunds_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_PaymentLogToUser" ADD CONSTRAINT "_PaymentLogToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."payment_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_PaymentLogToUser" ADD CONSTRAINT "_PaymentLogToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
