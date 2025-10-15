-- CreateEnum
CREATE TYPE "public"."ShippingType" AS ENUM ('FREE_OVER_AMOUNT', 'FLAT_RATE', 'WEIGHT_BASED');

-- CreateTable
CREATE TABLE "public"."shipping_configs" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" "public"."ShippingType" NOT NULL DEFAULT 'FREE_OVER_AMOUNT',
    "freeShippingThreshold" DOUBLE PRECISION DEFAULT 50,
    "baseShippingCost" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "additionalItemCost" DOUBLE PRECISION DEFAULT 2,
    "countries" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipping_configs_pkey" PRIMARY KEY ("id")
);
