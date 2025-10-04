// prisma/seed.js
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import logger from '../src/utils/logger.js'; // ✅ import your main logger

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  logger.info('🌱 Starting database seed...');

  // Check if admin already exists
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';

  try {
    const existingAdmin = await prisma.admin.findUnique({
      where: { email: adminEmail }
    });

    if (!existingAdmin) {
      logger.info(`👤 No admin found. Creating default admin: ${adminEmail}`);

      const hashedPassword = await bcrypt.hash(adminPassword, 12);

      await prisma.admin.create({
        data: {
          email: adminEmail,
          password: hashedPassword,
          role: 'SUPER_ADMIN'
        }
      });

      logger.info('✅ Default SUPER_ADMIN created successfully.');
    } else {
      logger.info(`ℹ️ Admin already exists: ${adminEmail}`);
    }

    // Add more seed data here if needed later
    // e.g., await prisma.category.createMany({ data: [...] });

  } catch (error) {
    logger.error('❌ Error during seeding:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    logger.info('🔌 Prisma connection closed.');
  }
}

main();
