// src/config/prisma.js
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

// Load environment variables
if (process.env.NODE_ENV === "test") {
  dotenv.config({ path: ".env.test" });
} else if (process.env.NODE_ENV === "staging") {
  dotenv.config({ path: ".env.staging" });
} else if (process.env.NODE_ENV === "production") {
  dotenv.config({ path: ".env.production" });
} else {
  dotenv.config(); // default .env
}

// Create a singleton instance of PrismaClient with connection timeout
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// Enhanced Prisma connection function with retries
export async function connectDB() {
  const maxRetries = 3;
  const retryDelay = 5000; // 5 seconds

  console.log('🔗 Attempting database connection...');
  
  // Log masked connection URL for debugging (without password)
  const maskedUrl = process.env.DATABASE_URL?.replace(/:\/\/[^:]+:[^@]+@/, '://***:***@');
  console.log('📡 Connecting to:', maskedUrl);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Connection attempt ${attempt}/${maxRetries}`);
      await prisma.$connect();
      console.log("✅ Database connected successfully");
      return;
    } catch (error) {
      console.error(`❌ Database connection attempt ${attempt} failed:`, error.message);
      
      if (attempt === maxRetries) {
        console.error("💥 All connection attempts failed");
        console.log("🔍 Troubleshooting tips:");
        console.log("   1. Check DATABASE_URL format in .env file");
        console.log("   2. Verify Supabase project is active");
        console.log("   3. Check if your IP is whitelisted in Supabase");
        console.log("   4. Ensure password is properly URL encoded");
        process.exit(1);
      }
      
      console.log(`⏳ Retrying in ${retryDelay/1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
}

export async function disconnectDB() {
  try {
    await prisma.$disconnect();
    console.log("✅ Database disconnected successfully");
  } catch (error) {
    console.error("❌ Database disconnection failed:", error);
    process.exit(1);
  }
}

export default prisma;