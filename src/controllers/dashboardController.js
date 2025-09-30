import dashboardService from "../services/dashboardService.js";
import { successResponse, errorResponse } from "../utils/responseHandler.js";
import HttpStatus from "../constants/httpStatusCode.js";

export class DashboardController {
  // Get overall dashboard statistics
  async getDashboardStats(req, res) {
    try {
      const { period = 'month' } = req.query;
      
      const result = await dashboardService.getDashboardStats(period);
      
      return successResponse(
        res,
        result.data,
        "Dashboard statistics fetched successfully",
        HttpStatus.OK
      );
    } catch (error) {
      console.error('Dashboard stats controller error:', error);
      return errorResponse(
        res,
        error.message || "Failed to fetch dashboard statistics",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // Get sales overview with time-series data
  async getSalesOverview(req, res) {
    try {
      const { period = 'month', groupBy = 'day' } = req.query;
      
      const result = await dashboardService.getSalesOverview(period, groupBy);
      
      return successResponse(
        res,
        result.data,
        "Sales overview fetched successfully",
        HttpStatus.OK
      );
    } catch (error) {
      console.error('Sales overview controller error:', error);
      return errorResponse(
        res,
        error.message || "Failed to fetch sales overview",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // Get best-selling products
  async getBestSellingProducts(req, res) {
    try {
      const { period = 'month', limit = 10 } = req.query;
      
      const result = await dashboardService.getBestSellingProducts(period, parseInt(limit));
      
      return successResponse(
        res,
        result.data,
        "Best-selling products fetched successfully",
        HttpStatus.OK
      );
    } catch (error) {
      console.error('Best sellers controller error:', error);
      return errorResponse(
        res,
        error.message || "Failed to fetch best-selling products",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // Get order volume statistics
  async getOrderVolume(req, res) {
    try {
      const { period = 'month' } = req.query;
      
      const result = await dashboardService.getOrderVolume(period);
      
      return successResponse(
        res,
        result.data,
        "Order volume data fetched successfully",
        HttpStatus.OK
      );
    } catch (error) {
      console.error('Order volume controller error:', error);
      return errorResponse(
        res,
        error.message || "Failed to fetch order volume data",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // Get refunds and returns data
  async getRefundsReturns(req, res) {
    try {
      const { period = 'month' } = req.query;
      
      const result = await dashboardService.getRefundsReturns(period);
      
      return successResponse(
        res,
        result.data,
        "Refunds and returns data fetched successfully",
        HttpStatus.OK
      );
    } catch (error) {
      console.error('Refunds controller error:', error);
      return errorResponse(
        res,
        error.message || "Failed to fetch refunds data",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}

export default new DashboardController();