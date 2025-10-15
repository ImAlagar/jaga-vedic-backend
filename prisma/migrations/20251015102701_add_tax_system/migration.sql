-- CreateEnum
CREATE TYPE "public"."TaxType" AS ENUM ('VAT', 'GST', 'SALES_TAX', 'CUSTOM');

-- CreateEnum
CREATE TYPE "public"."TaxCalculationType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');

-- CreateEnum
CREATE TYPE "public"."TaxInclusionType" AS ENUM ('EXCLUSIVE', 'INCLUSIVE');

-- CreateTable
CREATE TABLE "public"."tax_settings" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "taxType" "public"."TaxType" NOT NULL,
    "calculationType" "public"."TaxCalculationType" NOT NULL DEFAULT 'PERCENTAGE',
    "inclusionType" "public"."TaxInclusionType" NOT NULL DEFAULT 'EXCLUSIVE',
    "defaultRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."country_tax_rates" (
    "id" SERIAL NOT NULL,
    "taxSettingId" INTEGER NOT NULL,
    "countryCode" TEXT NOT NULL,
    "countryName" TEXT NOT NULL,
    "taxRate" DOUBLE PRECISION NOT NULL,
    "regionRates" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "appliesToShipping" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "country_tax_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."product_tax_overrides" (
    "id" SERIAL NOT NULL,
    "taxSettingId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "taxRate" DOUBLE PRECISION,
    "isTaxExempt" BOOLEAN NOT NULL DEFAULT false,
    "taxCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_tax_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "country_tax_rates_taxSettingId_countryCode_key" ON "public"."country_tax_rates"("taxSettingId", "countryCode");

-- CreateIndex
CREATE UNIQUE INDEX "product_tax_overrides_taxSettingId_productId_key" ON "public"."product_tax_overrides"("taxSettingId", "productId");

-- AddForeignKey
ALTER TABLE "public"."country_tax_rates" ADD CONSTRAINT "country_tax_rates_taxSettingId_fkey" FOREIGN KEY ("taxSettingId") REFERENCES "public"."tax_settings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."product_tax_overrides" ADD CONSTRAINT "product_tax_overrides_taxSettingId_fkey" FOREIGN KEY ("taxSettingId") REFERENCES "public"."tax_settings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."product_tax_overrides" ADD CONSTRAINT "product_tax_overrides_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
