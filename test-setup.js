// test-setup.js
import prisma from "./src/config/prisma.js";

async function testDatabase() {
  try {
    console.log("🔍 Testing database connection...");
    await prisma.$connect();
    console.log("✅ Database connected successfully");

    console.log("🔍 Checking products table...");
    const productCount = await prisma.product.count();
    console.log(`📊 Total products in database: ${productCount}`);

    if (productCount > 0) {
      console.log("🔍 Sample products:");
      const products = await prisma.product.findMany({
        take: 3,
        select: {
          id: true,
          name: true,
          printifyProductId: true,
          printifyVariants: true
        }
      });
      
      products.forEach(product => {
        console.log(`\nProduct ID: ${product.id}`);
        console.log(`Name: ${product.name}`);
        console.log(`Printify Product ID: ${product.printifyProductId}`);
        console.log(`Has Variants: ${!!product.printifyVariants}`);
        if (product.printifyVariants) {
          console.log(`Variants Count: ${product.printifyVariants.length}`);
          console.log(`First Variant: ${JSON.stringify(product.printifyVariants[0])}`);
        }
      });
    }

    await prisma.$disconnect();
    console.log("✅ Test completed successfully");
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

testDatabase();