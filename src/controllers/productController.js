// controllers/productController.js
import HttpStatus from "../constants/httpStatusCode.js";
import * as productService from "../services/productService.js";
import { successResponse, errorResponse } from "../utils/responseHandler.js";

export async function createProduct(req, res) {
  try {
    const productData = req.body;
    const imageFiles = req.files || [];

    const result = await productService.createProduct(productData, imageFiles);
    
    return successResponse(
      res, 
      result, 
      "Product created successfully", 
      HttpStatus.CREATED
    );
  } catch (error) {
    return errorResponse(res, error, HttpStatus.BAD_REQUEST);
  }
}

export async function getProducts(req, res) {
  try {
    const { page = 1, limit = 10, search = '', category = '', inStock = null } = req.query;
    
    const result = await productService.getProducts(
      parseInt(page), 
      parseInt(limit), 
      search, 
      category, 
      inStock !== null ? inStock === 'true' : null
    );
    
    return successResponse(
      res, 
      result, 
      "Products retrieved successfully", 
      HttpStatus.OK
    );
  } catch (error) {
    return errorResponse(res, error, HttpStatus.BAD_REQUEST);
  }
}

export async function getProduct(req, res) {
  try {
    const { id } = req.params;
    const product = await productService.getProductById(id);
    
    return successResponse(
      res, 
      product, 
      "Product retrieved successfully", 
      HttpStatus.OK
    );
  } catch (error) {
    return errorResponse(res, error, HttpStatus.NOT_FOUND);
  }
}

export async function updateProduct(req, res) {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const newImageFiles = req.files || [];

    const product = await productService.updateProduct(id, updateData, newImageFiles);
    
    return successResponse(
      res, 
      product, 
      "Product updated successfully", 
      HttpStatus.OK
    );
  } catch (error) {
    return errorResponse(res, error, HttpStatus.BAD_REQUEST);
  }
}

export async function deleteProduct(req, res) {
  try {
    const { id } = req.params;
    const result = await productService.deleteProduct(id);
    
    return successResponse(
      res, 
      null, 
      result.message, 
      HttpStatus.OK
    );
  } catch (error) {
    return errorResponse(res, error, HttpStatus.BAD_REQUEST);
  }
}

export async function toggleStock(req, res) {
  try {
    const { id } = req.params;
    const { inStock } = req.body;
    
    const result = await productService.toggleProductStock(id, inStock);
    
    return successResponse(
      res, 
      result, 
      result.message, 
      HttpStatus.OK
    );
  } catch (error) {
    return errorResponse(res, error, HttpStatus.BAD_REQUEST);
  }
}

export async function getCategories(req, res) {
  try {
    const categories = await productService.getCategories();
    
    return successResponse(
      res, 
      { categories }, 
      "Categories retrieved successfully", 
      HttpStatus.OK
    );
  } catch (error) {
    return errorResponse(res, error, HttpStatus.BAD_REQUEST);
  }
}

export async function deleteImage(req, res) {
  try {
    const { id } = req.params;
    const { imageUrl } = req.body;
    
    const result = await productService.deleteProductImage(id, imageUrl);
    
    return successResponse(
      res, 
      null, 
      result.message, 
      HttpStatus.OK
    );
  } catch (error) {
    return errorResponse(res, error, HttpStatus.BAD_REQUEST);
  }
}