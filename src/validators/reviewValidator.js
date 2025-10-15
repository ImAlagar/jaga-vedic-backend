import { body, param, query } from 'express-validator';

export const createReviewValidator = [
  body('productId')
    .isInt({ min: 1 })
    .withMessage('Product ID must be a positive integer')
    .toInt(),
  
  body('orderId')
    .isInt({ min: 1 })
    .withMessage('Order ID must be a positive integer')
    .toInt(),
  
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be an integer between 1 and 5')
    .toInt(),
  
  body('title')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Title must not exceed 100 characters')
    .trim(),
  
  body('comment')
    .isLength({ min: 1, max: 1000 })
    .withMessage('Comment is required and must not exceed 1000 characters')
    .trim(),
  
  body('images')
    .optional()
    .isArray()
    .withMessage('Images must be an array')
    .custom((images) => {
      if (images.length > 5) {
        throw new Error('Cannot upload more than 5 images');
      }
      return true;
    }),
  
  body('images.*')
    .optional()
    .isURL()
    .withMessage('Each image must be a valid URL')
];

export const updateReviewValidator = [
  param('reviewId')
    .isInt({ min: 1 })
    .withMessage('Review ID must be a positive integer')
    .toInt(),
  
  body('rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be an integer between 1 and 5')
    .toInt(),
  
  body('title')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Title must not exceed 100 characters')
    .trim(),
  
  body('comment')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Comment must not exceed 1000 characters')
    .trim(),
  
  body('images')
    .optional()
    .isArray()
    .withMessage('Images must be an array')
    .custom((images) => {
      if (images.length > 5) {
        throw new Error('Cannot upload more than 5 images');
      }
      return true;
    }),
  
  body('images.*')
    .optional()
    .isURL()
    .withMessage('Each image must be a valid URL')
];

export const helpfulVoteValidator = [
  param('reviewId')
    .isInt({ min: 1 })
    .withMessage('Review ID must be a positive integer')
    .toInt(),
  
  body('isHelpful')
    .isBoolean()
    .withMessage('isHelpful must be a boolean value')
];

export const reportReviewValidator = [
  param('reviewId')
    .isInt({ min: 1 })
    .withMessage('Review ID must be a positive integer')
    .toInt(),
  
  body('reason')
    .isLength({ min: 1, max: 500 })
    .withMessage('Reason is required and must not exceed 500 characters')
    .trim()
];

export const reviewQueryValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt()
    .default(1),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50')
    .toInt()
    .default(10),
  
  query('rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating filter must be between 1 and 5')
    .toInt(),
  
  query('sortBy')
    .optional()
    .isIn(['recent', 'helpful', 'rating_high', 'rating_low'])
    .withMessage('SortBy must be one of: recent, helpful, rating_high, rating_low')
    .default('recent')
];

export const adminReviewsQueryValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt()
    .default(1),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt()
    .default(10),
  
  query('search')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Search query must not exceed 100 characters')
    .trim(),
  
  query('status')
    .optional()
    .isIn(['all', 'pending', 'approved', 'rejected', 'reported'])
    .withMessage('Status must be one of: all, pending, approved, rejected, reported')
    .default('all'),
  
  query('rating')
    .optional()
    .isIn(['all', '1', '2', '3', '4', '5'])
    .withMessage('Rating must be one of: all, 1, 2, 3, 4, 5')
    .default('all'),
  
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'rating', 'helpful', 'user', 'product'])
    .withMessage('SortBy must be one of: createdAt, rating, helpful, user, product')
    .default('createdAt'),
  
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('SortOrder must be asc or desc')
    .default('desc'),
  
  query('dateFrom')
    .optional()
    .isISO8601()
    .withMessage('DateFrom must be a valid date')
    .toDate(),
  
  query('dateTo')
    .optional()
    .isISO8601()
    .withMessage('DateTo must be a valid date')
    .toDate()
];

export const bulkActionValidator = [
  body('reviewIds')
    .isArray({ min: 1 })
    .withMessage('Review IDs must be a non-empty array'),
  
  body('reviewIds.*')
    .isInt({ min: 1 })
    .withMessage('Each review ID must be a positive integer')
    .toInt()
];