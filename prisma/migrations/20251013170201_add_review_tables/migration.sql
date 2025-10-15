/*
  Warnings:

  - You are about to drop the `shipping_configs` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "public"."shipping_configs";

-- DropEnum
DROP TYPE "public"."ShippingType";

-- CreateTable
CREATE TABLE "public"."reviews" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "orderId" INTEGER NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "comment" TEXT,
    "images" TEXT[],
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "isHelpful" INTEGER NOT NULL DEFAULT 0,
    "isReported" BOOLEAN NOT NULL DEFAULT false,
    "reportReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."helpful_votes" (
    "id" SERIAL NOT NULL,
    "reviewId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "isHelpful" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "helpful_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."product_review_summaries" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "averageRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "ratingDistribution" JSONB NOT NULL,
    "totalHelpfulVotes" INTEGER NOT NULL DEFAULT 0,
    "lastCalculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_review_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reviews_userId_productId_orderId_key" ON "public"."reviews"("userId", "productId", "orderId");

-- CreateIndex
CREATE UNIQUE INDEX "helpful_votes_reviewId_userId_key" ON "public"."helpful_votes"("reviewId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "product_review_summaries_productId_key" ON "public"."product_review_summaries"("productId");

-- AddForeignKey
ALTER TABLE "public"."reviews" ADD CONSTRAINT "reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reviews" ADD CONSTRAINT "reviews_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reviews" ADD CONSTRAINT "reviews_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."helpful_votes" ADD CONSTRAINT "helpful_votes_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "public"."reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."helpful_votes" ADD CONSTRAINT "helpful_votes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."product_review_summaries" ADD CONSTRAINT "product_review_summaries_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
