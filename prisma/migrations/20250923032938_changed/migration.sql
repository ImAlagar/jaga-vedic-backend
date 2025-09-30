/*
  Warnings:

  - You are about to drop the column `printifyVariantId` on the `products` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[printifyOrderId]` on the table `orders` will be added. If there are existing duplicate values, this will fail.
  - Made the column `printifyProductId` on table `products` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."order_items" ADD COLUMN     "printifyVariantId" TEXT;

-- AlterTable
ALTER TABLE "public"."orders" ADD COLUMN     "orderImage" TEXT,
ADD COLUMN     "orderNotes" TEXT,
ADD COLUMN     "printifyOrderId" TEXT;

-- AlterTable
ALTER TABLE "public"."products" DROP COLUMN "printifyVariantId",
ALTER COLUMN "printifyProductId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "orders_printifyOrderId_key" ON "public"."orders"("printifyOrderId");
