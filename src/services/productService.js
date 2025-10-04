import axios from "axios";
import * as productModel from "../models/productModel.js";
import prisma from "../config/prisma.js";
import logger from "../utils/logger.js";

const printifyApi = axios.create({
  baseURL: "https://api.printify.com/v1",
  headers: {
    Authorization: `Bearer ${process.env.PRINTIFY_API_KEY}`,
    "Content-Type": "application/json",
  },
});

export async function syncProducts(shopId) {
  try {
    logger.info(`🔄 Sync started for Printify shop: ${shopId}`);

    let allProducts = [];
    let currentPage = 1;
    let hasMorePages = true;

    // Fetch all pages
    while (hasMorePages) {
      const { data } = await printifyApi.get(`/shops/${shopId}/products.json`, {
        params: { page: currentPage },
        timeout: 30000,
      });

      if (data?.data?.length > 0) {
        allProducts = allProducts.concat(data.data);
      }

      hasMorePages = !!data.next_page_url && data.data.length > 0;
      currentPage++;
      await new Promise((resolve) => setTimeout(resolve, 500)); // avoid rate limit
    }

    logger.info(`📦 Total products fetched: ${allProducts.length}`);

    let publishedCount = 0;
    let unpublishedCount = 0;
    let processedCount = 0;

    const batchSize = 10;
    const batches = [];
    for (let i = 0; i < allProducts.length; i += batchSize) {
      batches.push(allProducts.slice(i, i + batchSize));
    }

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];

      const batchPromises = batch.map(async (product) => {
        try {
          const isPublished = determinePublishingStatus(product);

          const variants = product.variants
            ? product.variants.map((variant) => ({
                id: variant.id,
                price: variant.price ? variant.price / 100 : 0,
                sku: variant.sku || "",
                isAvailable:
                  variant.is_available !== undefined
                    ? variant.is_available
                    : true,
                is_selected_for_publishing:
                  variant.is_selected_for_publishing || false,
                is_enabled:
                  variant.is_enabled !== undefined ? variant.is_enabled : true,
                title: variant.title || `Variant ${variant.id}`,
              }))
            : [];

          const result = await prisma.product.upsert({
            where: { printifyProductId: product.id },
            update: {
              name: product.title,
              description: product.description || "",
              price:
                product.variants && product.variants[0]?.price
                  ? product.variants[0].price / 100
                  : 0,
              images: product.images ? product.images.map((img) => img.src) : [],
              sku: product.variants && product.variants[0]?.sku,
              category:
                product.tags && product.tags[0] ? product.tags[0] : "general",
              printifyVariants: variants,
              printifyBlueprintId: product.blueprint_id || null,
              printifyPrintProviderId: product.print_provider_id || null,
              isPublished,
              updatedAt: new Date(),
            },
            create: {
              name: product.title,
              description: product.description || "",
              price:
                product.variants && product.variants[0]?.price
                  ? product.variants[0].price / 100
                  : 0,
              images: product.images ? product.images.map((img) => img.src) : [],
              printifyProductId: product.id,
              sku: product.variants && product.variants[0]?.sku,
              category:
                product.tags && product.tags[0] ? product.tags[0] : "general",
              printifyVariants: variants,
              printifyBlueprintId: product.blueprint_id || null,
              printifyPrintProviderId: product.print_provider_id || null,
              isPublished,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          });

          processedCount++;
          if (result.isPublished) publishedCount++;
          else unpublishedCount++;
        } catch (error) {
          logger.error(`Failed to process product: ${product.title} - ${error.message}`);
        }
      });

      await Promise.all(batchPromises);
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    logger.info(
      `✅ Sync completed: ${processedCount} processed | ${publishedCount} published | ${unpublishedCount} unpublished`
    );

    return {
      message: "Products synced successfully",
      totalProducts: allProducts.length,
      published: publishedCount,
      unpublished: unpublishedCount,
      processed: processedCount,
      pagesProcessed: currentPage - 1,
    };
  } catch (error) {
    logger.error(`Printify Sync Error: ${error.message}`);
    throw new Error(`Failed to sync products: ${error.message}`);
  }
}

function determinePublishingStatus(product) {
  if (product.is_deleted) return false;
  if (product.visible === false) return false;
  if (product.is_locked === true) return true;

  if (product.variants && product.variants.length > 0) {
    const publishedVariants = product.variants.filter(
      (v) => v.is_selected_for_publishing === true
    );
    return publishedVariants.length > 0;
  }

  return false;
}



export async function getAllProducts(page = 1, limit = 10, search = '', category = '', inStock = null) {
  try {
    const result = await productModel.findAllProducts(page, limit, search, category, inStock);
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

    if (!product.isPublished) {
      throw new Error('Product not found');
    }

    return product;
  } catch (error) {
    throw new Error(`Failed to fetch product: ${error.message}`);
  }
}

export async function getFilteredProducts(filters, options) {
  const { page = 1, limit = 12, sortBy = "createdAt", sortOrder = "desc" } = options;
  const offset = (page - 1) * limit;

  console.log('🔍 Filtered products query:', { filters, page, limit, offset });

  const finalFilters = {
    ...filters,
    isPublished: true
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where: finalFilters,
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
        isPublished: true,
        sku: true,
        printifyProductId: true,
        createdAt: true,
        updatedAt: true
      }
    }),
    prisma.product.count({ where: finalFilters })
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    data: products,
    pagination: {
      currentPage: page,
      totalPages: totalPages,
      totalCount: total,
      limit: limit,
      hasNext: page < totalPages,
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
        inStock: true,
        isPublished: true
      }
    }),
    prisma.product.aggregate({
      _min: { price: true },
      _max: { price: true },
      where: { 
        inStock: true,
        isPublished: true
      }
    }),
    prisma.product.groupBy({
      by: ['inStock'],
      _count: {
        id: true
      },
      where: {
        isPublished: true
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

export async function getAllProductsAdmin(page = 1, limit = 10, search = '', category = '', inStock = null, isPublished = null) {
  try {
    const result = await productModel.findAllProductsAdmin(page, limit, search, category, inStock, isPublished);
    return result;
  } catch (error) {
    throw new Error(`Failed to fetch products for admin: ${error.message}`);
  }
}