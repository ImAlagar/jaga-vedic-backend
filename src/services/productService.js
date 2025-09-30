// src/services/productService.js
import axios from "axios";
import * as productModel from "../models/productModel.js";

const printifyApi = axios.create({
  baseURL: "https://api.printify.com/v1",
  headers: {
    Authorization: `Bearer ${process.env.PRINTIFY_API_KEY}`,
    "Content-Type": "application/json",
  },
});

export async function syncProducts(shopId) {
  try {
    const { data } = await printifyApi.get(`/shops/${shopId}/products.json`);

    for (const product of data.data) {
      await productModel.upsertProduct(product);
    }

    return { message: "Products synced successfully", count: data.data.length };
  } catch (error) {
    console.error("Printify API Error:", error.response?.data || error.message);
    throw new Error(`Failed to sync products: ${error.message}`);
  }
}

export async function getAllProducts(page = 1, limit = 10, search = '', category = '') {
  try {
    const result = await productModel.findAllProducts(page, limit, search, category);
    return result;
  } catch (error) {
    throw new Error(`Failed to fetch products: ${error.message}`);
  }
}

export async function getProductById(productId) {
  try {
    const product = await productModel.findProductById(productId);
    
    if (!product) {
      throw new Error('Product not found');
    }

    return product;
  } catch (error) {
    throw new Error(`Failed to fetch product: ${error.message}`);
  }
}



export async function getFilteredProducts(filters, options) {
  const { page, limit, sortBy, sortOrder } = options;
  const offset = (page - 1) * limit;

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where: filters,
      skip: offset,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        images: true,
        category: true,
        inStock: true,
        sku: true,
        printifyProductId: true,
        createdAt: true,
        updatedAt: true
      }
    }),
    prisma.product.count({ where: filters })
  ]);

  return {
    data: products,
    meta: {
      total,
      page,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1
    }
  };
}

export async function getAvailableFilters() {
  const [categories, priceRange, stockCounts] = await Promise.all([
    prisma.product.findMany({
      select: { category: true },
      distinct: ['category'],
      where: { 
        category: { not: null },
        inStock: true 
      }
    }),
    prisma.product.aggregate({
      _min: { price: true },
      _max: { price: true },
      where: { inStock: true }
    }),
    prisma.product.groupBy({
      by: ['inStock'],
      _count: {
        id: true
      }
    })
  ]);

  const inStockCount = stockCounts.find(s => s.inStock)?._count?.id || 0;
  const outOfStockCount = stockCounts.find(s => !s.inStock)?._count?.id || 0;

  return {
    categories: categories.map(c => c.category).filter(Boolean).sort(),
    priceRange: {
      min: priceRange._min.price || 0,
      max: priceRange._max.price || 0
    },
    stockCounts: {
      inStock: inStockCount,
      outOfStock: outOfStockCount,
      total: inStockCount + outOfStockCount
    }
  };
}