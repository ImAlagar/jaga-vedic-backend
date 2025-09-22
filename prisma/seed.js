// prisma/seed.js
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');
  
  // Check if admin already exists
  const existingAdmin = await prisma.admin.findUnique({
    where: { email: process.env.ADMIN_EMAIL || 'admin@example.com' }
  });
  
  if (!existingAdmin) {
    // Create default admin
    const hashedPassword = await bcrypt.hash(
      process.env.ADMIN_PASSWORD || 'Admin@123', 
      12
    );
    
    await prisma.admin.create({
      data: {
        email: process.env.ADMIN_EMAIL || 'admin@example.com',
        password: hashedPassword,
        role: 'SUPER_ADMIN'
      }
    });
    
    console.log('✅ Default admin created');
  } else {
    console.log('ℹ️ Admin already exists');
  }
  
  // Add more seed data as needed
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });