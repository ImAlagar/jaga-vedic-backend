// src/controllers/lookbookController.js
import * as productService from "../services/productService.js";
import { successResponse, errorResponse } from "../utils/responseHandler.js";
import HttpStatus from "../constants/httpStatusCode.js";

export async function getLookbookCollections(req, res) {
  try {
    // Use your existing product categories as "collections"
    const products = await productService.getAllProducts(1, 100, '', '', true);
    
    // Extract unique categories from products
    const categories = [...new Set(products.products
      .filter(product => product.category && product.category.trim() !== '')
      .map(product => product.category)
    )].sort();

    const collections = categories.map(category => ({
      id: category.toLowerCase().replace(/\s+/g, '-'),
      name: category,
      slug: category.toLowerCase().replace(/\s+/g, '-'),
      description: `${category} collection`,
      coverImage: getCategoryCoverImage(category),
      productCount: products.products.filter(p => p.category === category).length
    }));

    return successResponse(
      res, 
      collections, 
      "Lookbook collections fetched successfully", 
      HttpStatus.OK
    );
  } catch (error) {
    return errorResponse(res, error.message, HttpStatus.BAD_REQUEST);
  }
}

export async function getLookbookLooks(req, res) {
  try {
    const {
      category,
      page = 1,
      limit = 12
    } = req.query;

    // Use your existing product filter with category
    const filters = {
      ...(category && category !== 'all' && { category: { equals: category, mode: 'insensitive' } })
    };

    const result = await productService.getFilteredProducts(filters, {
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy: "createdAt",
      sortOrder: "desc"
    });

    // Transform product data to lookbook format
    const looks = result.data.map(product => ({
      id: product.id,
      title: product.name,
      description: product.description,
      image: product.images?.[0] || '/default-image.jpg',
      tags: [product.category, ...getStyleTags(product.name)],
      collection: product.category,
      product: {
        id: product.id,
        name: product.name,
        price: product.price,
        inStock: product.inStock
      }
    }));

    return successResponse(
      res, 
      {
        looks,
        pagination: result.pagination
      }, 
      "Looks fetched successfully", 
      HttpStatus.OK
    );
  } catch (error) {
    return errorResponse(res, error.message, HttpStatus.BAD_REQUEST);
  }
}

export async function getAllLooks(req, res) {
  try {
    // Get all products for "all" category
    const result = await productService.getFilteredProducts({}, {
      page: 1,
      limit: 100,
      sortBy: "createdAt",
      sortOrder: "desc"
    });

    const looks = result.data.map(product => ({
      id: product.id,
      title: product.name,
      description: product.description,
      image: product.images?.[0] || '/default-image.jpg',
      tags: [product.category, ...getStyleTags(product.name)],
      collection: product.category,
      product: {
        id: product.id,
        name: product.name,
        price: product.price,
        inStock: product.inStock
      }
    }));

    return successResponse(
      res, 
      {
        looks,
        totalCount: looks.length
      }, 
      "All looks fetched successfully", 
      HttpStatus.OK
    );
  } catch (error) {
    return errorResponse(res, error.message, HttpStatus.BAD_REQUEST);
  }
}

export async function getLookbookFilters(req, res) {
  try {
    const products = await productService.getAllProducts(1, 100, '', '', true);
    
    // Get unique categories
    const categories = [...new Set(products.products
      .filter(product => product.category && product.category.trim() !== '')
      .map(product => product.category)
    )].sort();

    // Extract tags from product names and categories
    const allTags = new Set();
    products.products.forEach(product => {
      if (product.category) allTags.add(product.category.toLowerCase());
      // Add style tags from product name
      getStyleTags(product.name).forEach(tag => allTags.add(tag));
    });

    return successResponse(
      res, 
      {
        categories: categories,
        tags: Array.from(allTags).sort()
      }, 
      "Lookbook filters fetched successfully", 
      HttpStatus.OK
    );
  } catch (error) {
    return errorResponse(res, error.message, HttpStatus.BAD_REQUEST);
  }
}

// Helper functions
function getCategoryCoverImage(category) {
  const coverImages = {
    't-shirts': 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80',
    'hoodies': 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=800&q=80',
    'mugs': 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=800&q=80',
    'posters': 'https://images.unsplash.com/photo-1584824486539-53bb4646bdbc?auto=format&fit=crop&w=800&q=80',
    'phone-cases': 'https://images.unsplash.com/photo-1555774698-0b77e0d5fac6?auto=format&fit=crop&w=800&q=80'
  };

  return coverImages[category.toLowerCase()] || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=80';
}

function getStyleTags(productName) {
  const tags = [];
  const name = productName.toLowerCase();
  
  if (name.includes('t-shirt') || name.includes('tshirt')) tags.push('casual');
  if (name.includes('hoodie') || name.includes('sweatshirt')) tags.push('comfort');
  if (name.includes('premium') || name.includes('luxury')) tags.push('premium');
  if (name.includes('graphic') || name.includes('design')) tags.push('graphic');
  if (name.includes('minimal') || name.includes('simple')) tags.push('minimal');
  if (name.includes('vintage') || name.includes('retro')) tags.push('vintage');
  
  return tags;
}