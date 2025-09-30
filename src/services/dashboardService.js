import prisma from "../config/prisma.js";
import dashboardModel from "../models/dashboardModel.js";

export class DashboardService {
  // Get dashboard statistics
  async getDashboardStats(period = 'month') {
    try {
      const dateRange = this.getDateRange(period);
      const previousRange = this.getDateRange(period, true);

      const [
        salesData,
        orderStats,
        productStats,
        customerStats,
        growthRates,
        refundsData
      ] = await Promise.all([
        dashboardModel.getTotalSales(dateRange.start, dateRange.end),
        dashboardModel.getOrderStats(dateRange.start, dateRange.end),
        dashboardModel.getProductStats(),
        dashboardModel.getCustomerStats(dateRange.start, dateRange.end),
        dashboardModel.getGrowthRates(
          dateRange.start, dateRange.end,
          previousRange.start, previousRange.end
        ),
        dashboardModel.getRefundsReturns(dateRange.start, dateRange.end)
      ]);

      return {
        success: true,
        data: {
          sales: {
            total: salesData,
            growth: growthRates.salesGrowth
          },
          orders: {
            total: orderStats.total,
            pending: orderStats.pending,
            completed: orderStats.completed,
            growth: growthRates.orderGrowth
          },
          products: {
            total: productStats.total,
            lowStock: productStats.lowStock,
            bestSellers: productStats.bestSellers,
            growth: 5.2 // Static for now, can be calculated with product history
          },
          customers: {
            total: customerStats.total,
            newThisMonth: customerStats.newCustomers,
            active: customerStats.activeCustomers,
            growth: growthRates.customerGrowth
          },
          refunds: refundsData
        }
      };
    } catch (error) {
      console.error('Dashboard service error:', error);
      throw new Error(`Failed to get dashboard stats: ${error.message}`);
    }
  }

  // Get sales overview for charts
  async getSalesOverview(period = 'month', groupBy = 'day') {
    try {
      const dateRange = this.getDateRange(period);
      const salesData = await dashboardModel.getSalesOverview(dateRange.start, dateRange.end, groupBy);
      
      return {
        success: true,
        data: salesData
      };
    } catch (error) {
      console.error('Sales overview service error:', error);
      throw new Error(`Failed to get sales overview: ${error.message}`);
    }
  }

  // Get best-selling products
  async getBestSellingProducts(period = 'month', limit = 10) {
    try {
      const dateRange = this.getDateRange(period);
      const bestSellers = await dashboardModel.getBestSellingProducts(dateRange.start, dateRange.end, limit);
      
      // Calculate growth rates for each product
      const productsWithGrowth = await Promise.all(
        bestSellers.map(async (product) => {
          const previousRange = this.getDateRange(period, true);
          const previousSales = await this.getProductPreviousSales(product.id, previousRange);
          const growth = previousSales > 0 ? 
            ((product.sales - previousSales) / previousSales) * 100 : 0;

          return {
            ...product,
            growth: Math.round(growth * 100) / 100
          };
        })
      );

      return {
        success: true,
        data: productsWithGrowth
      };
    } catch (error) {
      console.error('Best sellers service error:', error);
      throw new Error(`Failed to get best-selling products: ${error.message}`);
    }
  }

  // Get order volume data
  async getOrderVolume(period = 'month') {
    try {
      const dateRange = this.getDateRange(period);
      const orderStats = await dashboardModel.getOrderVolume(dateRange.start, dateRange.end);
      
      return {
        success: true,
        data: {
          stats: orderStats,
          totalOrders: orderStats.reduce((sum, stat) => sum + stat._count.id, 0)
        }
      };
    } catch (error) {
      console.error('Order volume service error:', error);
      throw new Error(`Failed to get order volume: ${error.message}`);
    }
  }

  // Get refunds and returns data
  async getRefundsReturns(period = 'month') {
    try {
      const dateRange = this.getDateRange(period);
      const refundsData = await dashboardModel.getRefundsReturns(dateRange.start, dateRange.end);
      
      return {
        success: true,
        data: refundsData
      };
    } catch (error) {
      console.error('Refunds service error:', error);
      throw new Error(`Failed to get refunds data: ${error.message}`);
    }
  }

  // Helper methods
  getDateRange(period, previous = false) {
    const now = new Date();
    let start, end;

    switch (period) {
      case 'day':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        break;
      case 'week':
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        start = new Date(now.setDate(diff));
        end = new Date(now.setDate(diff + 6));
        break;
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'year':
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31);
        break;
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date();
    }

    if (previous) {
      const duration = end.getTime() - start.getTime();
      start = new Date(start.getTime() - duration);
      end = new Date(end.getTime() - duration);
    }

    return { start, end };
  }

  async getProductPreviousSales(productId, dateRange) {
    try {
      const result = await prisma.orderItem.aggregate({
        where: {
          productId: productId,
          order: {
            createdAt: { gte: dateRange.start, lte: dateRange.end },
            paymentStatus: 'SUCCEEDED'
          }
        },
        _sum: { quantity: true }
      });

      return result._sum.quantity || 0;
    } catch (error) {
      console.error('Error getting product previous sales:', error);
      return 0;
    }
  }
}

export default new DashboardService();