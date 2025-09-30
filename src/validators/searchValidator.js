// src/validators/searchValidator.js
import { query } from "express-validator";

export const searchValidator = [
  query("query")
    .optional()
    .isString()
    .isLength({ min: 2 })
    .withMessage("Search query must be at least 2 characters"),
  
  query("type")
    .optional()
    .isIn(["all", "products", "users", "orders", "categories"])
    .withMessage("Type must be one of: all, products, users, orders, categories"),
  
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),
  
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
  
  query("sortBy")
    .optional()
    .isString()
    .isIn(["name", "price", "createdAt", "updatedAt", "stock"])
    .withMessage("SortBy must be a valid field"),
  
  query("sortOrder")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("SortOrder must be asc or desc")
];