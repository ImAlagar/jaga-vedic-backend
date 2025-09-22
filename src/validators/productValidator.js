// validators/productValidator.js
import { body, param, query } from "express-validator";

export const createProductValidator = [
  body("name")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Product name must be between 2 and 100 characters"),
  
  body("description")
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage("Description must be between 10 and 1000 characters"),
  
  body("price")
    .isFloat({ min: 0.01 })
    .withMessage("Price must be a positive number"),
  
  body("category")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("Category must be less than 50 characters"),
  
  body("sku")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("SKU must be less than 50 characters"),
  
  body("printifyProductId")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Printify product ID must be less than 100 characters"),
  
  body("printifyVariantId")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Printify variant ID must be less than 100 characters")
];

export const updateProductValidator = [
  param("id")
    .isInt({ min: 1 })
    .withMessage("Invalid product ID"),
  
  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Product name must be between 2 and 100 characters"),
  
  body("description")
    .optional()
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage("Description must be between 10 and 1000 characters"),
  
  body("price")
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage("Price must be a positive number"),
  
  body("category")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("Category must be less than 50 characters"),
  
  body("sku")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("SKU must be less than 50 characters")
];

export const productQueryValidator = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),
  
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
  
  query("search")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Search term must be less than 100 characters"),
  
  query("category")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("Category must be less than 50 characters"),
  
  query("inStock")
    .optional()
    .isBoolean()
    .withMessage("inStock must be a boolean value")
];