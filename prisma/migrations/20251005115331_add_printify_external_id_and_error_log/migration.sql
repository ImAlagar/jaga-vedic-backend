/*
  Warnings:

  - A unique constraint covering the columns `[printifyExternalId]` on the table `orders` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."orders" ADD COLUMN     "errorLog" TEXT,
ADD COLUMN     "printifyExternalId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "orders_printifyExternalId_key" ON "public"."orders"("printifyExternalId");
