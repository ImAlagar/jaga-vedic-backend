import * as reviewService from "../services/reviewService.js";
import { successResponse, errorResponse } from "../utils/responseHandler.js";
import HttpStatus from "../constants/httpStatusCode.js";

export async function createReview(req, res) {
  try {
    const userId = req.user.id;
    const reviewData = req.body;

    const review = await reviewService.createReviewService(reviewData, userId);

    return successResponse(res, review, "Review created successfully", HttpStatus.CREATED);
  } catch (error) {
    console.error("Create review error:", error);
    return errorResponse(res, error.message, HttpStatus.BAD_REQUEST);
  }
}

export async function getProductReviews(req, res) {
  try {
    const { productId } = req.params;
    const query = req.query;

    if (!productId || isNaN(productId)) {
      return errorResponse(res, "Valid product ID is required", HttpStatus.BAD_REQUEST);
    }

    const result = await reviewService.getProductReviewsService(parseInt(productId), query);

    return successResponse(res, result, "Reviews fetched successfully", HttpStatus.OK);
  } catch (error) {
    console.error("Get product reviews error:", error);
    return errorResponse(res, error.message, HttpStatus.BAD_REQUEST);
  }
}

export async function updateReview(req, res) {
  try {
    const { reviewId } = req.params;
    const userId = req.user.id;
    const updateData = req.body;

    if (!reviewId || isNaN(reviewId)) {
      return errorResponse(res, "Valid review ID is required", HttpStatus.BAD_REQUEST);
    }

    const review = await reviewService.updateReviewService(parseInt(reviewId), updateData, userId);

    return successResponse(res, review, "Review updated successfully", HttpStatus.OK);
  } catch (error) {
    console.error("Update review error:", error);
    return errorResponse(res, error.message, HttpStatus.BAD_REQUEST);
  }
}

export async function deleteReview(req, res) {
  try {
    const { reviewId } = req.params;
    const userId = req.user.id;

    if (!reviewId || isNaN(reviewId)) {
      return errorResponse(res, "Valid review ID is required", HttpStatus.BAD_REQUEST);
    }

    const result = await reviewService.deleteReviewService(parseInt(reviewId), userId);

    return successResponse(res, result, "Review deleted successfully", HttpStatus.OK);
  } catch (error) {
    console.error("Delete review error:", error);
    return errorResponse(res, error.message, HttpStatus.BAD_REQUEST);
  }
}

export async function toggleHelpfulVote(req, res) {
  try {
    const { reviewId } = req.params;
    const userId = req.user.id;
    const { isHelpful } = req.body;

    if (!reviewId || isNaN(reviewId)) {
      return errorResponse(res, "Valid review ID is required", HttpStatus.BAD_REQUEST);
    }

    const result = await reviewService.toggleHelpfulVoteService(parseInt(reviewId), userId, isHelpful);

    return successResponse(res, result, "Vote recorded successfully", HttpStatus.OK);
  } catch (error) {
    console.error("Toggle helpful vote error:", error);
    return errorResponse(res, error.message, HttpStatus.BAD_REQUEST);
  }
}

export async function reportReview(req, res) {
  try {
    const { reviewId } = req.params;
    const userId = req.user.id;
    const { reason } = req.body;

    if (!reviewId || isNaN(reviewId)) {
      return errorResponse(res, "Valid review ID is required", HttpStatus.BAD_REQUEST);
    }

    const result = await reviewService.reportReviewService(parseInt(reviewId), userId, reason);

    return successResponse(res, result, "Review reported successfully", HttpStatus.OK);
  } catch (error) {
    console.error("Report review error:", error);
    return errorResponse(res, error.message, HttpStatus.BAD_REQUEST);
  }
}

export async function getUserReviews(req, res) {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const result = await reviewService.getUserReviewsService(userId, page, limit);

    return successResponse(res, result, "User reviews fetched successfully", HttpStatus.OK);
  } catch (error) {
    console.error("Get user reviews error:", error);
    return errorResponse(res, error.message, HttpStatus.BAD_REQUEST);
  }
}

// Admin controllers
export async function getPendingReviews(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const result = await reviewService.getPendingReviewsService(page, limit);

    return successResponse(res, result, "Pending reviews fetched successfully", HttpStatus.OK);
  } catch (error) {
    console.error("Get pending reviews error:", error);
    return errorResponse(res, error.message, HttpStatus.BAD_REQUEST);
  }
}

export async function approveReview(req, res) {
  try {
    const { reviewId } = req.params;

    if (!reviewId || isNaN(reviewId)) {
      return errorResponse(res, "Valid review ID is required", HttpStatus.BAD_REQUEST);
    }

    const review = await reviewService.approveReviewService(parseInt(reviewId));

    return successResponse(res, review, "Review approved successfully", HttpStatus.OK);
  } catch (error) {
    console.error("Approve review error:", error);
    return errorResponse(res, error.message, HttpStatus.BAD_REQUEST);
  }
}

export async function rejectReview(req, res) {
  try {
    const { reviewId } = req.params;
    const { reason } = req.body;

    if (!reviewId || isNaN(reviewId)) {
      return errorResponse(res, "Valid review ID is required", HttpStatus.BAD_REQUEST);
    }

    const result = await reviewService.rejectReviewService(parseInt(reviewId), reason);

    return successResponse(res, result, "Review rejected successfully", HttpStatus.OK);
  } catch (error) {
    console.error("Reject review error:", error);
    return errorResponse(res, error.message, HttpStatus.BAD_REQUEST);
  }
}

export async function getAdminReviews(req, res) {
  try {
    const filters = req.query;

    const result = await reviewService.getAdminReviewsService(filters);

    return successResponse(res, result, "Admin reviews fetched successfully", HttpStatus.OK);
  } catch (error) {
    console.error("Get admin reviews error:", error);
    return errorResponse(res, error.message, HttpStatus.BAD_REQUEST);
  }
}

export async function getAdminReviewStats(req, res) {
  try {
    const stats = await reviewService.getAdminReviewStats();

    return successResponse(res, stats, "Review stats fetched successfully", HttpStatus.OK);
  } catch (error) {
    console.error("Get admin review stats error:", error);
    return errorResponse(res, error.message, HttpStatus.BAD_REQUEST);
  }
}

export async function bulkApproveReviews(req, res) {
  try {
    const { reviewIds } = req.body;

    const result = await reviewService.bulkApproveReviewsService(reviewIds);

    return successResponse(res, result, "Reviews approved successfully", HttpStatus.OK);
  } catch (error) {
    console.error("Bulk approve reviews error:", error);
    return errorResponse(res, error.message, HttpStatus.BAD_REQUEST);
  }
}

export async function bulkDeleteReviews(req, res) {
  try {
    const { reviewIds } = req.body;

    const result = await reviewService.bulkDeleteReviewsService(reviewIds);

    return successResponse(res, result, "Reviews deleted successfully", HttpStatus.OK);
  } catch (error) {
    console.error("Bulk delete reviews error:", error);
    return errorResponse(res, error.message, HttpStatus.BAD_REQUEST);
  }
}