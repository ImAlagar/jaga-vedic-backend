/*
  Warnings:

  - A unique constraint covering the columns `[refreshToken]` on the table `admins` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[refreshToken]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."admins" ADD COLUMN     "refreshToken" TEXT;

-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "refreshToken" TEXT;

-- CreateTable
CREATE TABLE "public"."token_blacklist" (
    "id" SERIAL NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "token_blacklist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "token_blacklist_tokenHash_key" ON "public"."token_blacklist"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "admins_refreshToken_key" ON "public"."admins"("refreshToken");

-- CreateIndex
CREATE UNIQUE INDEX "users_refreshToken_key" ON "public"."users"("refreshToken");
