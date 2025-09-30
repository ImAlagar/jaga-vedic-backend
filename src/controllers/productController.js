// src/controllers/productController.js
import * as productService from "../services/productService.js";
import { successResponse, errorResponse } from "../utils/responseHandler.js";
import HttpStatus from "../constants/httpStatusCode.js";
import { ProductVariantService } from "../services/productVariantService.js";

export async function syncProducts(req, res) {
  try {
    const { shopId } = req.params;
    const result = await productService.syncProducts(shopId);

    return successResponse(res, result, "Products synced", HttpStatus.OK);
  } catch (error) {
    return errorResponse(res, error.message, HttpStatus.BAD_REQUEST);
  }
}

export async function getAllProducts(req, res) {
  try {
    // Get query parameters with defaults
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const category = req.query.category || '';
    const inStock = req.query.inStock !== undefined ? req.query.inStock === 'true' : null;

    const result = await productService.getAllProducts(page, limit, search, category, inStock);

    return successResponse(res, result, "Products fetched successfully", HttpStatus.OK);
  } catch (error) {
    return errorResponse(res, error.message, HttpStatus.BAD_REQUEST);
  }
}

export async function   getProductById(req, res) {
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


// src/controllers/productController.js - Add this function
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
      category,
      minPrice,
      maxPrice,
      inStock,
      search,
      page = 1,
      limit = 12,
      sortBy = "createdAt",
      sortOrder = "desc"
    } = req.query;

    const filters = {
      ...(category && { category: { equals: category, mode: 'insensitive' } }),
      ...(minPrice && { price: { gte: parseFloat(minPrice) } }),
      ...(maxPrice && { price: { lte: parseFloat(maxPrice) } }),
      ...(inStock !== undefined && { inStock: inStock === 'true' }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { category: { contains: search, mode: 'insensitive' } }
        ]
      })
    };

    const result = await productService.getFilteredProducts(filters, {
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy,
      sortOrder
    });

    return successResponse(res, result, "Products filtered successfully", HttpStatus.OK);
  } catch (error) {
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