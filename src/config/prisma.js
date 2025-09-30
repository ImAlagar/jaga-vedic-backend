// src/config/prisma.js
import { PrismaClient } from "@prisma/client";

// Simplified environment loading for production
if (process.env.NODE_ENV !== 'production') {
  import('dotenv').then(dotenv => dotenv.config());
}

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

export async function connectDB() {
  const maxRetries = 5;
  const retryDelay = 3000;

  console.log('🔗 Attempting database connection...');
  console.log('🏷️ Environment:', process.env.NODE_ENV);
  
  // Better URL masking
  const dbUrl = process.env.DATABASE_URL;
  const maskedUrl = dbUrl ? dbUrl.replace(/\/\/[^:]+:[^@]+@/, '//***:***@') : 'not set';
  console.log('📡 Database URL:', maskedUrl);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Connection attempt ${attempt}/${maxRetries}`);
      await prisma.$connect();
      
      // Test connection with a simple query
      await prisma.$queryRaw`SELECT 1`;
      
      console.log("✅ Database connected successfully");
      return;
    } catch (error) {
      console.error(`❌ Database connection attempt ${attempt} failed:`, error.message);
      
      if (attempt === maxRetries) {
        console.error("💥 All connection attempts failed");
        console.log("🔍 Detailed troubleshooting:");
        console.log("   - Check Supabase project status");
        console.log("   - Verify DATABASE_URL in Render environment variables");
        console.log("   - Check Supabase network settings");
        console.log("   - Ensure database is not paused");
        throw error; // Don't exit, let Render handle it
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
  }
}

export default prisma;