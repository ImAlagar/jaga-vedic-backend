-- CreateEnum
CREATE TYPE "public"."ShippingStatus" AS ENUM ('PENDING', 'LABEL_CREATED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED', 'RETURNED');

-- CreateTable
CREATE TABLE "public"."printify_shipping_cache" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "variantId" INTEGER NOT NULL,
    "country" TEXT NOT NULL,
    "region" TEXT,
    "shippingCost" DOUBLE PRECISION NOT NULL,
    "shippingMethod" INTEGER NOT NULL,
    "estimatedDays" JSONB,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "cachedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "printify_shipping_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."order_shipping" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "printifyOrderId" TEXT,
    "trackingNumber" TEXT,
    "trackingUrl" TEXT,
    "carrier" TEXT,
    "shippingCost" DOUBLE PRECISION NOT NULL,
    "shippingMethod" INTEGER,
    "shipmentDate" TIMESTAMP(3),
    "estimatedDelivery" TIMESTAMP(3),
    "actualDelivery" TIMESTAMP(3),
    "status" "public"."ShippingStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_shipping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "printify_shipping_cache_productId_variantId_country_region_key" ON "public"."printify_shipping_cache"("productId", "variantId", "country", "region");

-- AddForeignKey
ALTER TABLE "public"."printify_shipping_cache" ADD CONSTRAINT "printify_shipping_cache_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."order_shipping" ADD CONSTRAINT "order_shipping_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
