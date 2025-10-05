/*
  Warnings:

  - You are about to drop the column `errorLog` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `printifyExternalId` on the `orders` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."orders_printifyExternalId_key";

-- AlterTable
ALTER TABLE "public"."orders" DROP COLUMN "errorLog",
DROP COLUMN "printifyExternalId";
