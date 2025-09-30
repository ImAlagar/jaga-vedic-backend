-- CreateEnum
CREATE TYPE "public"."InquiryType" AS ENUM ('GENERAL', 'ORDER_SUPPORT', 'PRODUCT_QUESTION', 'SHIPPING', 'RETURNS', 'COMPLAINT', 'FEEDBACK', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."InquiryStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'SPAM');

-- CreateTable
CREATE TABLE "public"."contact_inquiries" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "inquiryType" "public"."InquiryType" NOT NULL DEFAULT 'GENERAL',
    "status" "public"."InquiryStatus" NOT NULL DEFAULT 'PENDING',
    "scheduleCallback" BOOLEAN NOT NULL DEFAULT false,
    "callbackTime" TIMESTAMP(3),
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_inquiries_pkey" PRIMARY KEY ("id")
);
