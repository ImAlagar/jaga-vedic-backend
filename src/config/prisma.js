// src/config/prisma.js
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import logger from "../utils/logger.js"; // ✅ Unified logger import

// Load environment variables dynamically based on NODE_ENV
if (process.env.NODE_ENV === "test") {
  dotenv.config({ path: ".env.test" });
} else if (process.env.NODE_ENV === "staging") {
  dotenv.config({ path: ".env.staging" });
} else if (process.env.NODE_ENV === "production") {
  dotenv.config({ path: ".env.production" });
} else {
  dotenv.config(); // default .env
}

// Create Prisma client with environment-aware logging
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// Database connection with retry mechanism
export async function connectDB() {
  const maxRetries = 3;
  const retryDelay = 5000; // 5 seconds

  const maskedUrl = process.env.DATABASE_URL?.replace(/:\/\/[^:]+:[^@]+@/, "://***:***@");
  logger.info("🔗 Attempting database connection...");
  logger.info(`📡 Connecting to: ${maskedUrl}`);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.info(`🔄 Connection attempt ${attempt}/${maxRetries}`);
      await prisma.$connect();
      logger.info("✅ Database connected successfully");
      return;
    } catch (error) {
      logger.error(`❌ Database connection attempt ${attempt} failed: ${error.message}`);

      if (attempt === maxRetries) {
        logger.error("💥 All connection attempts failed after retries");
        logger.error("🔍 Troubleshooting suggestions:");
        logger.error("   1️⃣ Check DATABASE_URL format in .env file");
        logger.error("   2️⃣ Ensure your database service (Supabase / Neon) is running");
        logger.error("   3️⃣ Check if your IP is whitelisted (if applicable)");
        logger.error("   4️⃣ Verify password is properly URL encoded");
        process.exit(1);
      }

      logger.warn(`⏳ Retrying in ${retryDelay / 1000} seconds...`);
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }
}

// Graceful disconnection
export async function disconnectDB() {
  try {
    await prisma.$disconnect();
    logger.info("✅ Database disconnected successfully");
  } catch (error) {
    logger.error("❌ Database disconnection failed:", error.message);
    process.exit(1);
  }
}

export default prisma;
