import { param, query } from "express-validator";

export const productSyncValidator = [
  param("shopId").isInt().withMessage("Shop ID must be an integer"),
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
    .isString()
    .isLength({ max: 100 })
    .withMessage("Search query must be a string with max 100 characters"),
  query("category")
    .optional()
    .isString()
    .isLength({ max: 50 })
    .withMessage("Category must be a string with max 50 characters"),
  query("inStock")
    .optional()
    .isBoolean()
    .withMessage("inStock must be a boolean value"),
  query("isPublished")
    .optional()
    .isBoolean()
    .withMessage("isPublished must be a boolean value")
];