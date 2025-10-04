// src/validators/contactValidator.js
import { body } from 'express-validator';

export const contactValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  body('subject')
    .trim()
    .notEmpty()
    .withMessage('Subject is required')
    .isLength({ min: 5, max: 200 })
    .withMessage('Subject must be between 5 and 200 characters'),
  
  body('message')
    .trim()
    .notEmpty()
    .withMessage('Message is required')
    .isLength({ min: 10, max: 2000 })
    .withMessage('Message must be between 10 and 2000 characters'),
  
  body('inquiryType')
    .optional()
    .isIn(['GENERAL', 'ORDER_SUPPORT', 'PRODUCT_QUESTION', 'SHIPPING', 'RETURNS', 'COMPLAINT', 'FEEDBACK', 'OTHER'])
    .withMessage('Invalid inquiry type'),
  
  body('phone')
    .optional()
    .trim()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  
  body('country')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Country must be between 2 and 100 characters'),
  
  body('scheduleCallback')
    .optional()
    .isBoolean()
    .withMessage('Schedule callback must be a boolean value'),
  
  body('callbackTime')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid callback time')
];

export const updateInquiryStatusValidator = [
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['PENDING', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'SPAM'])
    .withMessage('Invalid status value'),
  
  body('adminNotes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Admin notes must not exceed 1000 characters')
];