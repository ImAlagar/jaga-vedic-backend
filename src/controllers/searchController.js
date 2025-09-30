// src/controllers/searchController.js
import HttpStatus from "../constants/httpStatusCode.js";
import * as searchService from "../services/searchService.js";
import { successResponse, errorResponse } from "../utils/responseHandler.js";

export async function globalSearch(req, res) {
  try {
    const {
      query,
      type = "all",
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc"
    } = req.query;

    if (!query || query.trim().length < 2) {
      return errorResponse(res, "Search query must be at least 2 characters", HttpStatus.BAD_REQUEST);
    }

    const result = await searchService.globalSearch({
      query: query.trim(),
      type,
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy,
      sortOrder
    });

    return successResponse(
      res,
      result,
      "Search completed successfully",
      HttpStatus.OK
    );
  } catch (error) {
    return errorResponse(res, error.message, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

export async function getSearchSuggestions(req, res) {
  try {
    const { query, type = "products", limit = 5 } = req.query;

    if (!query || query.trim().length < 2) {
      return successResponse(res, { suggestions: [] }, "No suggestions for short query", HttpStatus.OK);
    }

    const suggestions = await searchService.getSearchSuggestions({
      query: query.trim(),
      type,
      limit: parseInt(limit)
    });

    return successResponse(
      res,
      suggestions,
      "Suggestions retrieved successfully",
      HttpStatus.OK
    );
  } catch (error) {
    return errorResponse(res, error.message, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

export async function getPopularSearches(req, res) {
  try {
    const { limit = 5 } = req.query;
    const popular = await searchService.getPopularSearches(parseInt(limit));
    
    return successResponse(
      res,
      popular,
      "Popular searches retrieved",
      HttpStatus.OK
    );
  } catch (error) {
    return errorResponse(res, error.message, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

export async function getTrendingProducts(req, res) {
  try {
    const { limit = 5 } = req.query;
    const trending = await searchService.getTrendingProducts(parseInt(limit));
    
    return successResponse(
      res,
      trending,
      "Trending products retrieved",
      HttpStatus.OK
    );
  } catch (error) {
    return errorResponse(res, error.message, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}