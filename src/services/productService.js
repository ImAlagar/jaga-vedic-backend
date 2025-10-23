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
                isAvailable: variant.is_available !== undefined ? variant.is_available : true,
                is_selected_for_publishing: variant.is_selected_for_publishing || false,
                is_enabled: variant.is_enabled !== undefined ? variant.is_enabled : true,
                title: variant.title || `Variant ${variant.id}`,
              }))
            : [];

          // ✅ ADD THIS: Extract color options from Printify API
          const colorOptions = product.options 
            ? product.options
                .filter(option => option.type === 'color')
                .flatMap(option => 
                  option.values.map(value => ({
                    name: value.title,
                    hexCode: value.colors && value.colors[0] ? value.colors[0] : '#000000',
                    printifyId: value.id
                  }))
                )
            : [];

          const result = await prisma.product.upsert({
            where: { printifyProductId: product.id },
            update: {
              name: product.title,
              description: product.description || "",
              price: product.variants && product.variants[0]?.price ? product.variants[0].price / 100 : 0,
              images: product.images ? product.images.map((img) => img.src) : [],
              sku: product.variants && product.variants[0]?.sku,
              category: product.tags && product.tags[0] ? product.tags[0] : "general",
              printifyVariants: variants,
              // ✅ ADD THIS: Store color options
              colorOptions: colorOptions, // This will be stored as JSON
              printifyBlueprintId: product.blueprint_id || null,
              printifyPrintProviderId: product.print_provider_id || null,
              isPublished,
              updatedAt: new Date(),
            },
            create: {
              name: product.title,
              description: product.description || "",
              price: product.variants && product.variants[0]?.price ? product.variants[0].price / 100 : 0,
              images: product.images ? product.images.map((img) => img.src) : [],
              printifyProductId: product.id,
              sku: product.variants && product.variants[0]?.sku,
              category: product.tags && product.tags[0] ? product.tags[0] : "general",
              printifyVariants: variants,
              // ✅ ADD THIS: Store color options
              colorOptions: colorOptions, // This will be stored as JSON
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

export async function getAllProducts(
  page = 1, 
  limit = 10, 
  search = '', 
  category = '', 
  inStock = null, 
  minPrice = null, 
  maxPrice = null
) {
  try {
    const result = await productModel.findAllProducts(
      page, 
      limit, 
      search, 
      category, 
      inStock, 
      minPrice, 
      maxPrice
    );
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


  // Build comprehensive where clause
  const whereClause = {
    isPublished: true,
    AND: [
      // Category filter (supports array or single value) - FIXED
      filters.categories ? {
        OR: Array.isArray(filters.categories) 
          ? filters.categories.map(cat => ({ 
              category: { 
                equals: cat, 
                mode: 'insensitive' 
              } 
            }))
          : [{ 
              category: { 
                equals: filters.categories, 
                mode: 'insensitive' 
              } 
            }]
      } : {},
      
      // Price range filter
      {
        AND: [
          filters.minPrice ? { price: { gte: parseFloat(filters.minPrice) } } : {},
          filters.maxPrice ? { price: { lte: parseFloat(filters.maxPrice) } } : {}
        ]
      },
      
      // Stock filter
      filters.inStock !== undefined ? { 
        inStock: filters.inStock === 'true' || filters.inStock === true
      } : {},
      
      // Search filter
      filters.search ? {
        OR: [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
          { category: { contains: filters.search, mode: 'insensitive' } }
        ]
      } : {}
    ].filter(condition => Object.keys(condition).length > 0)
  };


  // Get filtered products
  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where: whereClause,
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
    prisma.product.count({ where: whereClause })
  ]);

  // Calculate actual price range for the filtered results
  const priceStats = await prisma.product.aggregate({
    where: whereClause,
    _min: {
      price: true
    },
    _max: {
      price: true
    }
  });

  const totalPages = Math.ceil(total / limit);

  const result = {
    success: true,
    data: products,
    pagination: {
      currentPage: page,
      totalPages: totalPages,
      totalCount: total,
      limit: limit,
      hasNext: page < totalPages,
      hasPrev: page > 1
    },
    filters: {
      priceRange: {
        min: priceStats._min.price || 0,
        max: priceStats._max.price || 0
      },
      appliedFilters: filters
    }
  };


  return result;
}

export async function getAvailableFilters() {
  const [categories, priceRange, stockCounts, categoryCounts] = await Promise.all([
    // Get unique categories
    prisma.product.findMany({
      select: { category: true },
      distinct: ['category'],
      where: { 
        category: { not: null },
        isPublished: true
      }
    }),
    // Get price range
    prisma.product.aggregate({
      _min: { price: true },
      _max: { price: true },
      where: { 
        isPublished: true
      }
    }),
    // Get stock counts
    prisma.product.groupBy({
      by: ['inStock'],
      _count: {
        id: true
      },
      where: {
        isPublished: true
      }
    }),
    // Get category counts
    prisma.product.groupBy({
      by: ['category'],
      _count: {
        id: true
      },
      where: {
        category: { not: null },
        isPublished: true
      }
    })
  ]);

  const inStockCount = stockCounts.find(s => s.inStock)?._count?.id || 0;
  const outOfStockCount = stockCounts.find(s => !s.inStock)?._count?.id || 0;

  // Create category options with counts
  const categoryOptions = categoryCounts.map(cat => ({
    value: cat.category,
    label: cat.category,
    count: cat._count.id
  })).sort((a, b) => a.label.localeCompare(b.label));

  return {
    categories: categoryOptions,
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


export async function getSimilarProducts(productId, limit = 4) {
  try {
    const currentProduct = await productModel.findProductById(productId);
    
    if (!currentProduct) {
      throw new Error('Product not found');
    }

    const similarProducts = await prisma.product.findMany({
      where: {
        AND: [
          { id: { not: productId } },
          { category: currentProduct.category },
          { isPublished: true },
          { inStock: true }
        ]
      },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        images: true,
        category: true,
        inStock: true,
        sku: true,
        createdAt: true
      },
      take: limit,
      orderBy: { createdAt: 'desc' }
    });

    return similarProducts;
  } catch (error) {
    throw new Error(`Failed to fetch similar products: ${error.message}`);
  }
}

export async function getProductsByCategory(category, page = 1, limit = 12) {
  try {
    const skip = (page - 1) * limit;
    
    // Build where clause for category filter
    const whereClause = {
      isPublished: true,
      category: { 
        equals: category, 
        mode: 'insensitive' 
      }
    };


    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          images: true,
          category: true,
          inStock: true,
          isPublished: true,
          printifyProductId: true,
          sku: true,
          printifyVariants: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: { createdAt: 'desc' },
        skip: skip,
        take: limit
      }),
      prisma.product.count({ where: whereClause })
    ]);


    const totalPages = Math.ceil(totalCount / limit);

    return {
      success: true,
      data: products,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalCount: totalCount,
        limit: limit,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      category: category
    };
  } catch (error) {
    console.error("❌ Database error in getProductsByCategory:", error);
    throw new Error(`Failed to fetch products by category: ${error.message}`);
  }

  
}


export async function deleteProduct(productId) {
  try {
    logger.info(`🗑️ Attempting to delete product: ${productId}`);

    // First, check if product exists
    const existingProduct = await productModel.findProductById(productId);
    
    if (!existingProduct) {
      throw new Error('Product not found');
    }

    // Delete the product from database
    const result = await productModel.deleteProductById(productId);

    logger.info(`✅ Product deleted successfully: ${productId}`);
    
    return {
      success: true,
      message: 'Product deleted successfully',
      deletedProduct: {
        id: productId,
        name: existingProduct.name,
        printifyProductId: existingProduct.printifyProductId
      }
    };
  } catch (error) {
    logger.error(`❌ Failed to delete product ${productId}: ${error.message}`);
    throw new Error(`Failed to delete product: ${error.message}`);
  }
}

export async function deleteProductByPrintifyId(printifyProductId, shopId) {
  try {
    logger.info(`🗑️ Attempting to delete Printify product: ${printifyProductId} from shop: ${shopId}`);

    // First, delete from Printify API
    await printifyApi.delete(`/shops/${shopId}/products/${printifyProductId}.json`);

    // Then delete from our database
    const existingProduct = await productModel.findProductByPrintifyId(printifyProductId);
    
    if (existingProduct) {
      await productModel.deleteProductById(existingProduct.id);
    }

    logger.info(`✅ Printify product deleted successfully: ${printifyProductId}`);
    
    return {
      success: true,
      message: 'Product deleted from Printify and local database',
      deletedProduct: {
        printifyProductId: printifyProductId,
        name: existingProduct?.name
      }
    };
  } catch (error) {
    logger.error(`❌ Failed to delete Printify product ${printifyProductId}: ${error.message}`);
    
    // If Printify deletion fails but we have local record, still delete locally
    if (error.response?.status === 404) {
      const existingProduct = await productModel.findProductByPrintifyId(printifyProductId);
      if (existingProduct) {
        await productModel.deleteProductById(existingProduct.id);
        logger.info(`✅ Local product record deleted (Printify product not found): ${printifyProductId}`);
        return {
          success: true,
          message: 'Product deleted from local database (was not found on Printify)',
          deletedProduct: {
            printifyProductId: printifyProductId,
            name: existingProduct.name
          }
        };
      }
    }
    
    throw new Error(`Failed to delete Printify product: ${error.message}`);
  }
}


export async function bulkDeleteProducts(productIds) {
  try {
    logger.info(`🗑️ Attempting bulk delete for ${productIds.length} products`);

    if (!Array.isArray(productIds) || productIds.length === 0) {
      throw new Error('Product IDs array is required and cannot be empty');
    }

    const results = await productModel.bulkDeleteProducts(productIds);

    logger.info(`✅ Bulk delete completed: ${results.deletedCount} products deleted`);
    
    return {
      success: true,
      message: `Successfully deleted ${results.deletedCount} products`,
      ...results
    };
  } catch (error) {
    logger.error(`❌ Bulk delete failed: ${error.message}`);
    throw new Error(`Failed to delete products: ${error.message}`);
  }
}

// Add these functions to your productService.js
export async function getProductReviews(productId, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc') {
  try {
    const skip = (page - 1) * limit;

    const [reviews, totalCount, reviewSummary] = await Promise.all([
      // Get paginated reviews
      prisma.review.findMany({
        where: {
          productId: productId,
          isApproved: true // Only show approved reviews
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          helpfulVotes: {
            select: {
              userId: true,
              isHelpful: true
            }
          }
        },
        orderBy: { [sortBy]: sortOrder },
        skip: skip,
        take: limit
      }),
      
      // Get total count
      prisma.review.count({
        where: {
          productId: productId,
          isApproved: true
        }
      }),
      
      // Get review summary
      prisma.productReviewSummary.findUnique({
        where: { productId: productId }
      })
    ]);

    // Format reviews with helpful count and user vote status
    const formattedReviews = reviews.map(review => ({
      id: review.id,
      userId: review.user.id,
      userName: review.user.name,
      userEmail: review.user.email,
      rating: review.rating,
      title: review.title,
      comment: review.comment,
      images: review.images,
      isVerified: review.isVerified,
      helpfulCount: review.helpfulVotes.filter(vote => vote.isHelpful).length,
      hasVoted: false, // This would be set based on current user
      createdAt: review.createdAt,
      updatedAt: review.updatedAt
    }));

    const totalPages = Math.ceil(totalCount / limit);

    return {
      success: true,
      data: {
        reviews: formattedReviews,
        stats: reviewSummary || {
          averageRating: 0,
          totalReviews: 0,
          ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        },
        pagination: {
          currentPage: page,
          totalPages: totalPages,
          totalCount: totalCount,
          limit: limit,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    };
  } catch (error) {
    console.error("Error fetching product reviews:", error);
    throw new Error(`Failed to fetch product reviews: ${error.message}`);
  }
}

export async function getProductReviewStats(productId) {
  try {
    const reviewSummary = await prisma.productReviewSummary.findUnique({
      where: { productId: productId }
    });

    // If no summary exists, calculate basic stats
    if (!reviewSummary) {
      const reviews = await prisma.review.findMany({
        where: {
          productId: productId,
          isApproved: true
        },
        select: {
          rating: true,
          helpfulVotes: true
        }
      });

      if (reviews.length === 0) {
        return {
          averageRating: 0,
          totalReviews: 0,
          ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
          totalHelpfulVotes: 0
        };
      }

      const totalReviews = reviews.length;
      const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews;
      
      const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      reviews.forEach(review => {
        ratingDistribution[review.rating]++;
      });

      const totalHelpfulVotes = reviews.reduce((sum, review) => 
        sum + review.helpfulVotes.length, 0
      );

      return {
        averageRating: Math.round(averageRating * 10) / 10,
        totalReviews,
        ratingDistribution,
        totalHelpfulVotes
      };
    }

    return reviewSummary;
  } catch (error) {
    console.error("Error fetching product review stats:", error);
    throw new Error(`Failed to fetch product review stats: ${error.message}`);
  }
}

export async function getProductsWithReviewStats(page = 1, limit = 12, category = '', search = '') {
  try {
    const skip = (page - 1) * limit;
    
    // Build where clause
    const whereClause = {
      isPublished: true,
      AND: [
        category ? { category: { equals: category, mode: 'insensitive' } } : {},
        search ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } }
          ]
        } : {}
      ].filter(condition => Object.keys(condition).length > 0)
    };

    // Get products
    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where: whereClause,
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
        },
        orderBy: { createdAt: 'desc' },
        skip: skip,
        take: limit
      }),
      prisma.product.count({ where: whereClause })
    ]);

    // Get review stats for all products in one query
    const productIds = products.map(product => product.id);
    const reviewSummaries = await prisma.productReviewSummary.findMany({
      where: {
        productId: {
          in: productIds
        }
      }
    });

    // Create a map for quick lookup
    const reviewStatsMap = new Map();
    reviewSummaries.forEach(summary => {
      reviewStatsMap.set(summary.productId, summary);
    });

    // Combine products with their review stats
    const productsWithReviews = products.map(product => {
      const reviewStats = reviewStatsMap.get(product.id) || {
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        totalHelpfulVotes: 0
      };

      return {
        ...product,
        reviewStats: {
          averageRating: reviewStats.averageRating,
          totalReviews: reviewStats.totalReviews,
          ratingDistribution: reviewStats.ratingDistribution
        }
      };
    });

    const totalPages = Math.ceil(totalCount / limit);

    return {
      success: true,
      data: productsWithReviews,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalCount: totalCount,
        limit: limit,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  } catch (error) {
    console.error("Error fetching products with review stats:", error);
    throw new Error(`Failed to fetch products with review stats: ${error.message}`);
  }
}