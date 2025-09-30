import prisma from "../config/prisma.js";

export class DashboardModel {
  // Get total sales for a date range
  async getTotalSales(startDate, endDate) {
    try {
      const result = await prisma.order.aggregate({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          paymentStatus: 'SUCCEEDED'
        },
        _sum: { totalAmount: true }
      });
      return result._sum.totalAmount || 0;
    } catch (error) {
      console.error('Error getting total sales:', error);
      throw new Error('Failed to fetch sales data');
    }
  }

// Get order statistics - FIXED for your Prisma schema
async getOrderStats(startDate, endDate) {
  try {
    const [total, pending, completed, processing, shipped] = await Promise.all([
      prisma.order.count({
        where: { createdAt: { gte: startDate, lte: endDate } }
      }),
      prisma.order.count({
        where: { 
          createdAt: { gte: startDate, lte: endDate },
          fulfillmentStatus: 'PLACED'
        }
      }),
      prisma.order.count({
        where: { 
          createdAt: { gte: startDate, lte: endDate }, // FIXED: changed ggte to gte
          fulfillmentStatus: 'DELIVERED'
        }
      }),
      prisma.order.count({
        where: { 
          createdAt: { gte: startDate, lte: endDate },
          fulfillmentStatus: 'PROCESSING'
        }
      }),
      prisma.order.count({
        where: { 
          createdAt: { gte: startDate, lte: endDate },
          fulfillmentStatus: 'SHIPPED'
        }
      })
    ]);

    return { 
      total, 
      pending, 
      completed, 
      processing,
      shipped 
    };
  } catch (error) {
    console.error('Error getting order stats:', error);
    throw new Error('Failed to fetch order statistics');
  }
}

  // Get product statistics - FIXED for your Prisma schema
  async getProductStats() {
    try {
      const [total, inStock, outOfStock] = await Promise.all([
        prisma.product.count(),
        prisma.product.count({ where: { inStock: true } }),
        prisma.product.count({ where: { inStock: false } })
      ]);

      return { total, inStock, outOfStock };
    } catch (error) {
      console.error('Error getting product stats:', error);
      throw new Error('Failed to fetch product statistics');
    }
  }

  // Get customer statistics - FIXED: Removed lastLogin field
  async getCustomerStats(startDate, endDate) {
    try {
      const [total, newCustomers, activeCustomers] = await Promise.all([
        prisma.user.count({ where: { isActive: true } }),
        prisma.user.count({
          where: { 
            createdAt: { gte: startDate, lte: endDate },
            isActive: true 
          }
        }),
        // Active customers: users who made purchases in last 30 days
        prisma.user.count({
          where: {
            isActive: true,
            orders: {
              some: { 
                createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } 
              }
            }
          }
        })
      ]);

      return { total, newCustomers, activeCustomers };
    } catch (error) {
      console.error('Error getting customer stats:', error);
      throw new Error('Failed to fetch customer statistics');
    }
  }

  // Get sales overview data for charts
  async getSalesOverview(startDate, endDate, groupBy = 'day') {
    try {
      const orders = await prisma.order.findMany({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          paymentStatus: 'SUCCEEDED'
        },
        select: {
          createdAt: true,
          totalAmount: true
        },
        orderBy: { createdAt: 'asc' }
      });

      // Group data by time period
      const groupedData = this.groupSalesData(orders, groupBy);
      return groupedData;
    } catch (error) {
      console.error('Error getting sales overview:', error);
      throw new Error('Failed to fetch sales overview');
    }
  }

  // Get best-selling products - FIXED: Simplified revenue calculation
  async getBestSellingProducts(startDate, endDate, limit = 10) {
    try {
      const bestSellers = await prisma.orderItem.groupBy({
        by: ['productId'],
        where: {
          order: {
            createdAt: { gte: startDate, lte: endDate },
            paymentStatus: 'SUCCEEDED'
          }
        },
        _sum: { 
          quantity: true
        },
        orderBy: { _sum: { quantity: 'desc' } },
        take: limit
      });

      // Get product details and calculate revenue properly
      const productsWithDetails = await Promise.all(
        bestSellers.map(async (item) => {
          const product = await prisma.product.findUnique({
            where: { id: item.productId },
            select: { name: true, price: true, images: true }
          });

          // Calculate revenue: quantity * product price
          const revenue = (item._sum.quantity || 0) * (product?.price || 0);

          return {
            id: item.productId,
            name: product?.name || 'Unknown Product',
            sales: item._sum.quantity || 0,
            revenue: revenue,
            growth: 0 // We'll calculate this separately
          };
        })
      );

      return productsWithDetails;
    } catch (error) {
      console.error('Error getting best sellers:', error);
      throw new Error('Failed to fetch best-selling products');
    }
  }

  // Get order volume data
  async getOrderVolume(startDate, endDate) {
    try {
      const orderStats = await prisma.order.groupBy({
        by: ['fulfillmentStatus'],
        where: {
          createdAt: { gte: startDate, lte: endDate }
        },
        _count: { id: true },
        _sum: { totalAmount: true }
      });

      return orderStats;
    } catch (error) {
      console.error('Error getting order volume:', error);
      throw new Error('Failed to fetch order volume data');
    }
  }

  // Get refunds and returns data
  async getRefundsReturns(startDate, endDate) {
    try {
      const refundStats = await prisma.order.groupBy({
        by: ['paymentStatus'],
        where: {
          createdAt: { gte: startDate, lte: endDate },
          paymentStatus: { in: ['REFUNDED', 'FAILED'] }
        },
        _count: { id: true },
        _sum: { totalAmount: true }
      });

      const totalRefunds = refundStats.find(stat => stat.paymentStatus === 'REFUNDED')?._sum.totalAmount || 0;
      const totalSales = await this.getTotalSales(startDate, endDate);
      const refundRate = totalSales > 0 ? (totalRefunds / totalSales) * 100 : 0;

      return {
        totalRefunds,
        refundRate: Math.round(refundRate * 100) / 100,
        refundCount: refundStats.find(stat => stat.paymentStatus === 'REFUNDED')?._count.id || 0,
        failedCount: refundStats.find(stat => stat.paymentStatus === 'FAILED')?._count.id || 0
      };
    } catch (error) {
      console.error('Error getting refunds data:', error);
      throw new Error('Failed to fetch refunds data');
    }
  }

  // Helper method to group sales data by time period
  groupSalesData(orders, groupBy) {
    const grouped = {};
    
    orders.forEach(order => {
      const date = new Date(order.createdAt);
      let key;
      
      switch (groupBy) {
        case 'day':
          key = date.toISOString().split('T')[0]; // YYYY-MM-DD
          break;
        case 'week':
          const week = this.getWeekNumber(date);
          key = `${date.getFullYear()}-W${week}`;
          break;
        case 'month':
          key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
          break;
        default:
          key = date.toISOString().split('T')[0];
      }
      
      if (!grouped[key]) {
        grouped[key] = { sales: 0, orders: 0, date: key };
      }
      
      grouped[key].sales += order.totalAmount;
      grouped[key].orders += 1;
    });
    
    return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
  }

  // Helper method to get week number
  getWeekNumber(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
    return weekNo;
  }

  // Get growth percentages compared to previous period
  async getGrowthRates(currentStart, currentEnd, previousStart, previousEnd) {
    try {
      const [currentSales, previousSales, currentOrders, previousOrders, currentCustomers, previousCustomers] = await Promise.all([
        this.getTotalSales(currentStart, currentEnd),
        this.getTotalSales(previousStart, previousEnd),
        prisma.order.count({ where: { createdAt: { gte: currentStart, lte: currentEnd } } }),
        prisma.order.count({ where: { createdAt: { gte: previousStart, lte: previousEnd } } }),
        prisma.user.count({ where: { createdAt: { gte: currentStart, lte: currentEnd }, isActive: true } }),
        prisma.user.count({ where: { createdAt: { gte: previousStart, lte: previousEnd }, isActive: true } })
      ]);

      const salesGrowth = previousSales > 0 ? ((currentSales - previousSales) / previousSales) * 100 : currentSales > 0 ? 100 : 0;
      const orderGrowth = previousOrders > 0 ? ((currentOrders - previousOrders) / previousOrders) * 100 : currentOrders > 0 ? 100 : 0;
      const customerGrowth = previousCustomers > 0 ? ((currentCustomers - previousCustomers) / previousCustomers) * 100 : currentCustomers > 0 ? 100 : 0;

      return {
        salesGrowth: Math.round(salesGrowth * 100) / 100,
        orderGrowth: Math.round(orderGrowth * 100) / 100,
        customerGrowth: Math.round(customerGrowth * 100) / 100
      };
    } catch (error) {
      console.error('Error calculating growth rates:', error);
      return { salesGrowth: 0, orderGrowth: 0, customerGrowth: 0 };
    }
  }
}

export default new DashboardModel();    