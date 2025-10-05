// src/services/orderService.js
import prisma from "../config/prisma.js";
import { PrintifyOrderService } from "./printifyOrderService.js";
import { sendMail } from "../utils/mailer.js";
import { getOrderConfirmationEmail, getAdminNewOrderEmail } from "../utils/emailTemplates.js";
import logger from "../utils/logger.js";
import { ProductVariantService } from "./productVariantService.js";
import { FulfillmentStatus, PaymentStatus } from "@prisma/client";

export class OrderService {
  constructor() {
    this.variantService = new ProductVariantService();
  }

  // 🔹 Create Order
  async createOrder(userId, orderData) {
    const { items, shippingAddress, orderImage, orderNotes } = orderData;

    // 1. Ensure user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error(`User with ID ${userId} not found`);

    // 2. Pre-fetch all products at once
    const productIds = items.map(item => item.productId);
    const products = await prisma.product.findMany({
        where: { id: { in: productIds } }
    });
    
    const productMap = new Map(products.map(p => [p.id, p]));

    // 3. Calculate total + prepare items
    let totalAmount = 0;
    let subtotalAmount = 0;
    const orderItems = [];
    
    // Validate all variants in parallel
    const validationPromises = items.map(item => 
        this.variantService.validateVariant(item.productId, item.variantId)
    );
    
    const variantResults = await Promise.all(validationPromises);

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const variantInfo = variantResults[i];
        const product = productMap.get(item.productId);

        if (!product) throw new Error(`Product ${item.productId} not found`);
        if (!product.inStock) throw new Error(`Product ${product.name} out of stock`);

        const itemTotal = variantInfo.price * item.quantity;
        totalAmount += itemTotal;
        subtotalAmount += itemTotal;

        orderItems.push({
            productId: item.productId,
            quantity: item.quantity,
            price: variantInfo.price,
            printifyVariantId: item.variantId.toString(),
            printifyBlueprintId: variantInfo.blueprintId,
            printifyPrintProviderId: variantInfo.printProviderId,
            size: item.size,
            color: item.color,
        });
    }

    // 4. Save order in DB
    const order = await prisma.order.create({
        data: {
            userId,
            totalAmount,
            subtotalAmount,
            paymentStatus: "PENDING",
            fulfillmentStatus: "PLACED",
            shippingAddress,
            orderImage,
            orderNotes,
            items: {
                create: orderItems,
            },
        },
        include: {
            user: true,
            items: { include: { product: true } },
        },
    });

    logger.info(`✅ Order ${order.id} created in DB`);

    // 5. ASYNC OPERATIONS - Don't wait for these
    this.handleAsyncOperations(order).catch(err => {
        logger.error(`Async operations failed for order ${order.id}:`, err);
    });

    return order;
  }

  // 🔹 Handle async operations
  async handleAsyncOperations(order) {
    try {
      // Run Printify and Email in parallel
      await Promise.allSettled([
        this.forwardToPrintify(order),
        this.sendOrderNotifications(order)
      ]);
    } catch (error) {
      logger.error(`Async operations error for order ${order.id}:`, error);
    }
  }

  // 🔹 Forward to Printify - FIXED
  async forwardToPrintify(order) {
    try {
      const printifyService = new PrintifyOrderService(process.env.PRINTIFY_SHOP_ID);
      const printifyItems = order.items.map((item) => ({
        ...item,
        printifyProductId: item.product.printifyProductId,
        sku: item.product.sku,
      }));

      const printifyOrder = await printifyService.createOrder({
        orderId: order.id,
        items: printifyItems,
        shippingAddress: order.shippingAddress,
        orderImage: order.orderImage,
      });

      // Only update if it's a new order (not existing one)
      if (!printifyOrder.existing) {
        await prisma.order.update({
          where: { id: order.id },
          data: {
            printifyOrderId: printifyOrder.id,
            fulfillmentStatus: "PROCESSING",
          },
        });

        logger.info(`✅ Order ${order.id} forwarded to Printify: ${printifyOrder.id}`);
      } else {
        logger.info(`ℹ️ Order ${order.id} already exists in Printify: ${printifyOrder.id}`);
        
        // Update with existing Printify order ID
        await prisma.order.update({
          where: { id: order.id },
          data: {
            printifyOrderId: printifyOrder.id,
            fulfillmentStatus: "PROCESSING",
          },
        });
      }
    } catch (err) {
      logger.error(`⚠️ Printify forwarding failed for order ${order.id}:`, {
        error: err.message,
        stack: err.stack
      });
      
      // Update order status to indicate failure
      await prisma.order.update({
        where: { id: order.id },
        data: {
          fulfillmentStatus: "FAILED",
          errorLog: err.message
        }
      });
    }
  }

  // 🔹 Send notifications
  async sendOrderNotifications(order) {
    try {
      await Promise.allSettled([
        sendMail(
          order.user.email,
          `Order Confirmation - #${order.id}`,
          getOrderConfirmationEmail(order)
        ),
        sendMail(
          process.env.ADMIN_EMAIL,
          `New Order - #${order.id}`,
          getAdminNewOrderEmail(order)
        )
      ]);
      logger.info(`📧 Notifications sent for order ${order.id}`);
    } catch (mailErr) {
      logger.error(`❌ Email sending failed: ${mailErr.message}`);
    }
  }

  // 🔹 Retry Printify Forwarding
  async retryPrintifyForwarding(orderId) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: true,
        items: { include: { product: true } },
      },
    });

    if (!order) throw new Error("Order not found");
    
    // Check current status
    if (order.fulfillmentStatus === "PROCESSING" || order.fulfillmentStatus === "SHIPPED") {
      throw new Error(`Order is already in ${order.fulfillmentStatus} status`);
    }

    // Reset status to allow retry
    await prisma.order.update({
      where: { id: orderId },
      data: { 
        fulfillmentStatus: "PLACED",
        errorLog: null 
      }
    });

    const printifyService = new PrintifyOrderService(process.env.PRINTIFY_SHOP_ID);
    const printifyItems = order.items.map((item) => ({
      ...item,
      printifyProductId: item.product.printifyProductId,
      sku: item.product.sku,
    }));

    const printifyOrder = await printifyService.createOrder({
      orderId: order.id,
      items: printifyItems,
      shippingAddress: order.shippingAddress,
      orderImage: order.orderImage,
    });

    await prisma.order.update({
      where: { id: orderId },
      data: { 
        printifyOrderId: printifyOrder.id, 
        fulfillmentStatus: "PROCESSING" 
      },
    });

    logger.info(`✅ Retry successful: Order ${orderId} forwarded as ${printifyOrder.id}`);
    return printifyOrder.id;
  }

  // ... (keep all your other existing methods the same)
  async getUserOrders(userId) {
    try {
      const orders = await prisma.order.findMany({
        where: { userId },
        include: {
          items: {
            include: {
              product: {
                select: { id: true, name: true, price: true, images: true },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
       
      return orders;
    } catch (error) {
      console.error('Error in getUserOrders:', error);
      throw error;
    }
  }

  async getAllOrders() {
    return await prisma.order.findMany({
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        items: {
          include: {
            product: {
              select: { id: true, name: true, price: true, images: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async updateOrderStatus(orderId, statusData) {
    const { paymentStatus, fulfillmentStatus } = statusData;

    if (!paymentStatus && !fulfillmentStatus) {
      throw new Error("At least one of paymentStatus or fulfillmentStatus is required");
    }

    return await prisma.order.update({
      where: { id: orderId },
      data: {
        ...(paymentStatus && { paymentStatus }),
        ...(fulfillmentStatus && { fulfillmentStatus }),
      },
      include: {
        user: true,
        items: { include: { product: true } },
      },
    });
  }

  async getOrderStats() {
    try {
      const totalOrders = await prisma.order.count();
      
      const pending = await prisma.order.count({
        where: {
          OR: [
            { fulfillmentStatus: FulfillmentStatus.PLACED },
            { fulfillmentStatus: FulfillmentStatus.PROCESSING },
            { fulfillmentStatus: FulfillmentStatus.SHIPPED }
          ]
        }
      });
      
      const completed = await prisma.order.count({
        where: {
          fulfillmentStatus: FulfillmentStatus.DELIVERED
        }
      });
      
      const revenueResult = await prisma.order.aggregate({
        where: {
          fulfillmentStatus: FulfillmentStatus.DELIVERED,
          paymentStatus: PaymentStatus.SUCCEEDED
        },
        _sum: {
          totalAmount: true
        }
      });
      
      const revenue = revenueResult._sum.totalAmount || 0;
      
      return {
        totalOrders,
        pending,
        completed,
        revenue
      };
    } catch (error) {
      console.error("Error fetching order stats:", error); 
      throw new Error('Failed to fetch order statistics');
    }
  }

  async getOrderById(orderId) {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          user: {
            select: { 
              id: true, 
              name: true, 
              email: true 
            },
          },
          items: {
            include: {
              product: {
                select: { 
                  id: true, 
                  name: true, 
                  price: true, 
                  images: true,
                  printifyProductId: true
                },
              },
            },
          },
        },
      });

      if (!order) {
        throw new Error("Order not found");
      }

      return order;
    } catch (error) {
      console.error('Error in getOrderById:', error);
      throw error;
    }
  }

  async getAvailableFilters() {
    try {
      const [statusCounts, paymentStatusCounts, dateRange] = await Promise.all([
        prisma.order.groupBy({
          by: ['fulfillmentStatus'],
          _count: {
            id: true
          }
        }),
        prisma.order.groupBy({
          by: ['paymentStatus'],
          _count: {
            id: true
          }
        }),
        prisma.order.aggregate({
          _min: { createdAt: true },
          _max: { createdAt: true }
        })
      ]);

      return {
        statuses: statusCounts.map(s => ({
          value: s.fulfillmentStatus,
          label: s.fulfillmentStatus.charAt(0) + s.fulfillmentStatus.slice(1).toLowerCase(),
          count: s._count.id
        })),
        paymentStatuses: paymentStatusCounts.map(p => ({
          value: p.paymentStatus,
          label: p.paymentStatus.charAt(0) + p.paymentStatus.slice(1).toLowerCase(),
          count: p._count.id
        })),
        dateRange: {
          min: dateRange._min.createdAt,
          max: dateRange._max.createdAt
        }
      };
    } catch (error) {
      console.error('Error in getAvailableFilters:', error);
      throw error;
    }
  }

  async getFilteredOrders(filters, options) {
    try {
      const { page, limit, sortBy, sortOrder } = options;
      const offset = (page - 1) * limit;

      const [orders, total] = await Promise.all([
        prisma.order.findMany({
          where: filters,
          skip: offset,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            items: {
              include: {
                product: {
                  select: {
                    name: true,
                    price: true,
                    images: true
                  }
                }
              }
            }
          }
        }),
        prisma.order.count({ where: filters })
      ]);

      return {
        data: orders,
        meta: {
          total,
          page,
          totalPages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      console.error('Error in getFilteredOrders:', error);
      throw error;
    }
  }
}