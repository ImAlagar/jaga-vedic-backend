-- AlterTable
ALTER TABLE "public"."orders" ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "paymentError" TEXT;
