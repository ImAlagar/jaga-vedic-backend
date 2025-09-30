-- AlterTable
ALTER TABLE "public"."products" ADD COLUMN     "printifyBlueprintId" INTEGER,
ADD COLUMN     "printifyPrintProviderId" INTEGER,
ADD COLUMN     "printifyVariants" JSONB;
