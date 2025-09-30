// src/services/searchService.js
import * as searchModel from "../models/searchModel.js";

export async function globalSearch(params) {
  const { query, type, page, limit, sortBy, sortOrder } = params;
  
  const offset = (page - 1) * limit;

  switch (type) {
    case 'products':
      return await searchModel.searchProducts(query, limit, offset, sortBy, sortOrder);
    case 'users':
      return await searchModel.searchUsers(query, limit, offset, sortBy, sortOrder);
    case 'orders':
      return await searchModel.searchOrders(query, limit, offset, sortBy, sortOrder);
    case 'all':
    default:
      return await searchModel.searchAll(query, limit, offset);
  }
}

export async function getSearchSuggestions(params) {
  const { query, type, limit } = params;
  
  switch (type) {
    case 'products':
      return await searchModel.getProductSuggestions(query, limit);
    case 'users':
      return await searchModel.getUserSuggestions(query, limit);
    case 'categories':
      return await searchModel.getCategorySuggestions(query, limit);
    default:
      return await searchModel.getAllSuggestions(query, limit);
  }
}

export async function getPopularSearches(limit = 5) {
  // For now, return mock data. You can implement tracking later
  return {
    popular: [
      { text: "t-shirt", count: 150 },
      { text: "hoodie", count: 120 },
      { text: "summer collection", count: 95 },
      { text: "limited edition", count: 80 },
      { text: "custom design", count: 75 }
    ]
  };
}

export async function getTrendingProducts(limit = 5) {
  return await searchModel.getTrendingProducts(limit);
}