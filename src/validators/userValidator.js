// validators/userValidator.js
import { body } from "express-validator";

export const registerValidator = [
  body("name")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters")
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage("Name can only contain letters and spaces"),
  
  body("email")
    .isEmail()
    .withMessage("Valid email address is required")
    .normalizeEmail(),
  
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage("Password must contain uppercase, lowercase, number, and special character"),
  
  body("phone")
    .optional()
    .isMobilePhone()
    .withMessage("Valid phone number is required"),
  
  body("address")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Address must be less than 200 characters")
];

export const loginValidator = [
  body("email")
    .isEmail()
    .withMessage("Valid email address is required")
    .normalizeEmail(),
  
  body("password")
    .notEmpty()
    .withMessage("Password is required")
];

export const updateProfileValidator = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters"),
  
  body("phone")
    .optional()
    .isMobilePhone()
    .withMessage("Valid phone number is required"),
  
  body("address")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Address must be less than 200 characters")
];

export const changePasswordValidator = [
  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required"),
  
  body("newPassword")
    .isLength({ min: 8 })
    .withMessage("New password must be at least 8 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage("Password must contain uppercase, lowercase, number, and special character")
];