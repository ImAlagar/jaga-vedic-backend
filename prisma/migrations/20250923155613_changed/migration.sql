/*
  Warnings:

  - You are about to drop the column `paymentError` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `paymentMethod` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `stripeCustomerId` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `orders` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."orders" DROP COLUMN "paymentError",
DROP COLUMN "paymentMethod",
DROP COLUMN "stripeCustomerId",
DROP COLUMN "updatedAt";
