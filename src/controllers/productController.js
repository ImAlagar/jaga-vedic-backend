import * as productService from "../services/productService.js";
import { successResponse, errorResponse } from "../utils/responseHandler.js";
import HttpStatus from "../constants/httpStatusCode.js";
import { ProductVariantService } from "../services/productVariantService.js";
import prisma from "../config/prisma.js";

export async function syncProducts(req, res) {
  try {
    const { shopId } = req.params;
    
    // Set longer timeout for sync endpoint
    req.setTimeout(300000); // 5 minutes timeout
    
    const result = await productService.syncProducts(shopId);

    return successResponse(res, result, "Products synced", HttpStatus.OK);
  } catch (error) {
    console.error("Sync products error:", error);
    return errorResponse(res, error.message, HttpStatus.BAD_REQUEST);
  }
}

export async function getAllProducts(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const category = req.query.category || '';
    
    // Handle string values for inStock
    const inStock = req.query.inStock !== undefined 
      ? req.query.inStock === 'true' ? true 
        : req.query.inStock === 'false' ? false 
        : null
      : null;

    const minPrice = req.query.minPrice ? parseFloat(req.query.minPrice) : null;
    const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice) : null;

    const result = await productService.getAllProducts(
      page, 
      limit, 
      search, 
      category, 
      inStock,
      minPrice,
      maxPrice
    );

    return successResponse(res, result, "Products fetched successfully", HttpStatus.OK);
  } catch (error) {
    console.error("💥 Backend getAllProducts error:", error);
    return errorResponse(res, error.message || "Internal server error", HttpStatus.BAD_REQUEST);
  }
}

export async function getProductById(req, res) {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(id)) {
      return errorResponse(res, "Valid product ID is required", HttpStatus.BAD_REQUEST);
    }
      
    const product = await productService.getProductById(parseInt(id));

    return successResponse(res, product, "Product fetched successfully", HttpStatus.OK);
  } catch (error) {
    if (error.message === 'Product not found') {
      return errorResponse(res, "Product not found", HttpStatus.NOT_FOUND);
    }
    return errorResponse(res, error.message, HttpStatus.BAD_REQUEST);
  }
}

export async function getAllProductsAdmin(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const category = req.query.category || '';
    const inStock = req.query.inStock !== undefined ? req.query.inStock === 'true' : null;
    const isPublished = req.query.isPublished !== undefined ? req.query.isPublished === 'true' : null;

    const result = await productService.getAllProductsAdmin(page, limit, search, category, inStock, isPublished);

    return successResponse(res, result, "Products fetched successfully for admin", HttpStatus.OK);
  } catch (error) {
    return errorResponse(res, error.message, HttpStatus.BAD_REQUEST);
  }
}

export async function getProductVariants(req, res) {
  try {
    const { productId } = req.params;
    
    if (!productId || isNaN(productId)) {
      return errorResponse(res, "Valid product ID is required", HttpStatus.BAD_REQUEST);
    }

    const variantService = new ProductVariantService();
    const variants = await variantService.getProductVariants(parseInt(productId));

    return successResponse(res, variants, "Product variants fetched successfully", HttpStatus.OK);
  } catch (error) {
    if (error.message === 'Product not found') {
      return errorResponse(res, "Product not found", HttpStatus.NOT_FOUND);
    }
    return errorResponse(res, error.message, HttpStatus.BAD_REQUEST);
  }
}

export async function filterProducts(req, res) {
  try {
    const {
      categories, // Changed from 'category' to 'categories' to match your URL
      minPrice,
      maxPrice,
      inStock,
      search,
      page = 1,
      limit = 12,
      sortBy = "createdAt",
      sortOrder = "desc"
    } = req.query;

    console.log('🔍 Filter parameters received:', {
      categories,
      minPrice,
      maxPrice,
      inStock,
      search,
      page,
      limit
    });

    // Build filters object for service
    const filters = {
      ...(categories && { categories }), // Pass categories as is to service
      ...(minPrice && { minPrice: parseFloat(minPrice) }),
      ...(maxPrice && { maxPrice: parseFloat(maxPrice) }),
      ...(inStock !== undefined && { inStock: inStock === 'true' }),
      ...(search && { search })
    };

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy,
      sortOrder
    };

    console.log('📋 Calling service with filters:', filters);

    const result = await productService.getFilteredProducts(filters, options);

    return successResponse(res, result, "Products filtered successfully", HttpStatus.OK);
  } catch (error) {
    console.error("💥 Filter products error:", error);
    return errorResponse(res, error.message, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

export async function getProductFilters(req, res) {
  try {
    const filters = await productService.getAvailableFilters();
    return successResponse(res, filters, "Filters retrieved successfully", HttpStatus.OK);
  } catch (error) {
    return errorResponse(res, error.message, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

export async function debugProducts(req, res) {
  try {
    const { showUnpublished = 'false' } = req.query;
    
    const products = await prisma.product.findMany({
      where: showUnpublished === 'true' ? {} : { isPublished: true },
      select: {
        id: true,
        name: true,
        isPublished: true,
        printifyProductId: true,
        category: true,
        printifyVariants: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    // Analyze variants data
    const analysis = products.map(product => {
      const variants = product.printifyVariants || [];
      const publishedVariants = variants.filter(v => v.is_selected_for_publishing === true);
      
      return {
        id: product.id,
        name: product.name,
        isPublished: product.isPublished,
        totalVariants: variants.length,
        publishedVariants: publishedVariants.length,
        variantData: variants.map(v => ({
          id: v.id,
          is_selected_for_publishing: v.is_selected_for_publishing
        }))
      };
    });

    return successResponse(res, {
      totalProducts: products.length,
      publishedProducts: products.filter(p => p.isPublished).length,
      unpublishedProducts: products.filter(p => !p.isPublished).length,
      analysis: analysis
    }, "Debug information", HttpStatus.OK);
  } catch (error) {
    return errorResponse(res, error.message, HttpStatus.BAD_REQUEST);
  }
}


export async function getSimilarProducts(req, res) {
  try {
    const { productId } = req.params;
    const limit = parseInt(req.query.limit) || 4;
    
    if (!productId || isNaN(productId)) {
      return errorResponse(res, "Valid product ID is required", HttpStatus.BAD_REQUEST);
    }

    // Get current product to find similar ones - FIXED: use getProductById instead of findProductById
    const currentProduct = await productService.getProductById(parseInt(productId));
    if (!currentProduct) {
      return errorResponse(res, "Product not found", HttpStatus.NOT_FOUND);
    }

    // Find similar products by category
    const similarProducts = await prisma.product.findMany({
      where: {
        AND: [
          { id: { not: parseInt(productId) } }, // Exclude current product
          { category: currentProduct.category }, // Same category
          { isPublished: true }, // Only published products
          { inStock: true } // Only in-stock products
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

    return successResponse(res, similarProducts, "Similar products fetched successfully", HttpStatus.OK);
  } catch (error) {
    console.error("Get similar products error:", error);
    return errorResponse(res, error.message, HttpStatus.BAD_REQUEST);
  }
}

// In your productController.js file
export async function getProductsByCategory(req, res) {
  try {
    const { category } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;

    console.log(`🎯 Category filter request: ${category}, page: ${page}, limit: ${limit}`);

    if (!category) {
      return errorResponse(res, "Category parameter is required", HttpStatus.BAD_REQUEST);
    }

    // Validate category exists
    const availableFilters = await productService.getAvailableFilters();
    const validCategories = availableFilters.categories.map(cat => cat.value);
    
    if (!validCategories.includes(category)) {
      return errorResponse(res, `Invalid category. Available categories: ${validCategories.join(', ')}`, HttpStatus.BAD_REQUEST);
    }

    const result = await productService.getProductsByCategory(category, page, limit);

    return successResponse(res, result, `Products in category "${category}" fetched successfully`, HttpStatus.OK);
  } catch (error) {
    console.error("💥 Backend getProductsByCategory error:", error);
    return errorResponse(res, error.message || "Internal server error", HttpStatus.BAD_REQUEST);
  }
}


export async function deleteProduct(req, res) {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return errorResponse(res, "Valid product ID is required", HttpStatus.BAD_REQUEST);
    }

    const result = await productService.deleteProduct(parseInt(id));

    return successResponse(res, result, "Product deleted successfully", HttpStatus.OK);
  } catch (error) {
    if (error.message === 'Product not found') {
      return errorResponse(res, "Product not found", HttpStatus.NOT_FOUND);
    }
    return errorResponse(res, error.message, HttpStatus.BAD_REQUEST);
  }
}

export async function deletePrintifyProduct(req, res) {
  try {
    const { printifyProductId, shopId } = req.params;

    if (!printifyProductId || !shopId) {
      return errorResponse(res, "Printify Product ID and Shop ID are required", HttpStatus.BAD_REQUEST);
    }

    const result = await productService.deleteProductByPrintifyId(printifyProductId, shopId);

    return successResponse(res, result, "Printify product deleted successfully", HttpStatus.OK);
  } catch (error) {
    if (error.message.includes('not found')) {
      return errorResponse(res, "Product not found", HttpStatus.NOT_FOUND);
    }
    return errorResponse(res, error.message, HttpStatus.BAD_REQUEST);
  }
}

export async function bulkDeleteProducts(req, res) {
  try {
    const { productIds } = req.body;

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return errorResponse(res, "Product IDs array is required and cannot be empty", HttpStatus.BAD_REQUEST);
    }

    // Validate all IDs are numbers
    const invalidIds = productIds.filter(id => isNaN(parseInt(id)));
    if (invalidIds.length > 0) {
      return errorResponse(res, `Invalid product IDs: ${invalidIds.join(', ')}`, HttpStatus.BAD_REQUEST);
    }

    const result = await productService.bulkDeleteProducts(productIds);

    return successResponse(res, result, "Products deleted successfully", HttpStatus.OK);
  } catch (error) {
    return errorResponse(res, error.message, HttpStatus.BAD_REQUEST);
  }
}