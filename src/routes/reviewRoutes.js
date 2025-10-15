import express from "express";
import { 
  createReview,
  getProductReviews,
  updateReview,
  deleteReview,
  toggleHelpfulVote,
  reportReview,
  getUserReviews,
  getPendingReviews,
  approveReview,
  rejectReview,
  bulkDeleteReviews,
  bulkApproveReviews,
  getAdminReviews
} from "../controllers/reviewController.js";
import { 
  createReviewValidator,
  updateReviewValidator,
  helpfulVoteValidator,
  reportReviewValidator,
  reviewQueryValidator,
  adminReviewsQueryValidator,
  bulkActionValidator
} from "../validators/reviewValidator.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { verifyUserToken } from "../middlewares/authToken.js";
import { verifyAdminToken } from "../middlewares/authToken.js";
import { body, param } from "express-validator";
import { getAdminReviewStats } from "../services/reviewService.js";

const router = express.Router();

// Public routes
router.get(
  "/product/:productId", 
  reviewQueryValidator,
  validateRequest,
  getProductReviews
);

// User routes (authenticated)
router.post(
  "/", 
  verifyUserToken,
  createReviewValidator,
  validateRequest,
  createReview
);

router.get(
  "/my-reviews", 
  verifyUserToken,
  reviewQueryValidator,
  validateRequest,
  getUserReviews
);

router.put(
  "/:reviewId", 
  verifyUserToken,
  updateReviewValidator,
  validateRequest,
  updateReview
);

router.delete(
  "/:reviewId", 
  verifyUserToken,
  param('reviewId').isInt({ min: 1 }).withMessage('Valid review ID is required'),
  validateRequest,
  deleteReview
);

router.post(
  "/:reviewId/helpful", 
  verifyUserToken,
  helpfulVoteValidator,
  validateRequest,
  toggleHelpfulVote
);

router.post(
  "/:reviewId/report", 
  verifyUserToken,
  reportReviewValidator,
  validateRequest,
  reportReview
);

// Admin routes
router.get(
  "/admin/pending", 
  verifyAdminToken,
  reviewQueryValidator,
  validateRequest,
  getPendingReviews
);

router.patch(
  "/admin/:reviewId/approve", 
  verifyAdminToken,
  param('reviewId').isInt({ min: 1 }).withMessage('Valid review ID is required'),
  validateRequest,
  approveReview
);

router.delete(
  "/admin/:reviewId/reject", 
  verifyAdminToken,
  param('reviewId').isInt({ min: 1 }).withMessage('Valid review ID is required'),
  body('reason').optional().isLength({ max: 500 }).withMessage('Reason must not exceed 500 characters'),
  validateRequest,
  rejectReview
);

// Enhanced Admin routes
router.get(
  "/admin/all", 
  verifyAdminToken,
  adminReviewsQueryValidator,
  validateRequest,
  getAdminReviews
);

router.get(
  "/admin/stats", 
  verifyAdminToken,
  getAdminReviewStats
);
    
router.post(
  "/admin/bulk-approve", 
  verifyAdminToken,
  bulkActionValidator,
  validateRequest,
  bulkApproveReviews
);

router.post(
  "/admin/bulk-delete", 
  verifyAdminToken,
  bulkActionValidator,
  validateRequest,
  bulkDeleteReviews
);


export default router;