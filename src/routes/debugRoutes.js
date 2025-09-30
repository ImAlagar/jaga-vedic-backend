// src/routes/debugRoutes.js
import express from "express";
import prisma from "../config/prisma.js";

const router = express.Router();

// Debug endpoint to check product data
router.get("/products", async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        printifyProductId: true,
        printifyVariants: true,
        printifyBlueprintId: true,
        printifyPrintProviderId: true,
        inStock: true,
        createdAt: true
      },
      take: 10,
      orderBy: { id: 'asc' }
    });

    res.json({
      success: true,
      count: products.length,
      products: products.map(p => ({
        id: p.id,
        name: p.name,
        printifyProductId: p.printifyProductId,
        hasVariants: !!p.printifyVariants,
        variantsCount: p.printifyVariants ? p.printifyVariants.length : 0,
        blueprintId: p.printifyBlueprintId,
        printProviderId: p.printifyPrintProviderId,
        inStock: p.inStock,
        createdAt: p.createdAt
      }))
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Debug endpoint to check specific product
router.get("/products/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({
      where: { id: parseInt(id) }
    });

    if (!product) {
      return res.status(404).json({ 
        success: false, 
        error: "Product not found" 
      });
    }

    res.json({
      success: true,
      product: {
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        images: product.images,
        printifyProductId: product.printifyProductId,
        printifyVariants: product.printifyVariants,
        printifyBlueprintId: product.printifyBlueprintId,
        printifyPrintProviderId: product.printifyPrintProviderId,
        category: product.category,
        inStock: product.inStock,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Debug endpoint to check database connection
router.get("/db-status", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ 
      success: true, 
      message: "Database connection successful" 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: "Database connection failed: " + error.message 
    });
  }
});

export default router;