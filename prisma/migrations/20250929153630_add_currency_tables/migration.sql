/*
  Warnings:

  - You are about to drop the column `scheduleCallback` on the `contact_inquiries` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."contact_inquiries" DROP COLUMN "scheduleCallback";

-- CreateTable
CREATE TABLE "public"."currencies" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "countryCodes" TEXT[],
    "locale" TEXT NOT NULL DEFAULT 'en-US',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "currencies_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "public"."currency_update_logs" (
    "id" SERIAL NOT NULL,
    "base" TEXT NOT NULL DEFAULT 'USD',
    "ratesCount" INTEGER NOT NULL,
    "success" BOOLEAN NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "currency_update_logs_pkey" PRIMARY KEY ("id")
);
