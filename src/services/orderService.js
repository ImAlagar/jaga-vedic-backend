// src/services/orderService.js
import prisma from "../config/prisma.js";
import { PrintifyOrderService } from "./printifyOrderService.js";
import { sendMail } from "../utils/mailer.js";
import { getOrderConfirmationEmail, getAdminNewOrderEmail, getOrderShippedEmail } from "../utils/emailTemplates.js";
import logger from "../utils/logger.js";
import { ProductVariantService } from "./productVariantService.js";
import { FulfillmentStatus, PaymentStatus } from "@prisma/client";
import RazorpayService from "./razorpayService.js"; // ✅ Change this line

export class OrderService {
  constructor() {
    this.variantService = new ProductVariantService();
    this.printifyService = new PrintifyOrderService(process.env.PRINTIFY_SHOP_ID);
     this.razorpayService = RazorpayService; // ✅ Change this line - no 'new' since it's already instantiated
  }

  printifyStatusMap = {
    'on-hold': 'PROCESSING',
    'in-production': 'PROCESSING',
    'fulfilled': 'SHIPPED',
    'shipped': 'SHIPPED',
    'delivered': 'DELIVERED',
    'canceled': 'CANCELLED',
    'refunded': 'REFUNDED'
  };

  async createOrder(userId, orderData) {
    const { items, shippingAddress, orderImage, orderNotes } = orderData;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error(`User with ID ${userId} not found`);

    const productIds = items.map(item => item.productId);
    const products = await prisma.product.findMany({
        where: { id: { in: productIds } }
    });
    
    const productMap = new Map(products.map(p => [p.id, p]));

    let totalAmount = 0;
    let subtotalAmount = 0;
    const orderItems = [];
    
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

    this.handleAsyncOperations(order).catch(err => {
        logger.error(`Async operations failed for order ${order.id}:`, err);
    });

    return order;
  }

  async handleAsyncOperations(order) {
    try {
        await Promise.allSettled([
            this.forwardToPrintify(order),
            this.sendOrderNotifications(order)
        ]);
    } catch (error) {
        logger.error(`Async operations error for order ${order.id}:`, error);
    }
  }

  async forwardToPrintify(order) {
    try {
        const printifyItems = order.items.map((item) => ({
            ...item,
            printifyProductId: item.product.printifyProductId,
            sku: item.product.sku,
        }));

        const printifyOrder = await this.printifyService.createOrder({
            orderId: order.id,
            items: printifyItems,
            shippingAddress: order.shippingAddress,
            orderImage: order.orderImage,
        });

        await prisma.order.update({
            where: { id: order.id },
            data: {
                printifyOrderId: printifyOrder.id,
                fulfillmentStatus: "PROCESSING",
            },
        });

        logger.info(`✅ Order ${order.id} forwarded to Printify: ${printifyOrder.id}`);
    } catch (err) {
        logger.error(`⚠️ Printify forwarding failed for order ${order.id}: ${err.message}`);
    }
  }

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

  async debugOrderSync(orderId) {
    try {
      const order = await this.getOrderById(orderId);
      
      if (!order) {
        return { success: false, error: `Order ${orderId} not found in database` };
      }

      const debugInfo = {
        orderId: order.id,
        database: {
          printifyOrderId: order.printifyOrderId,
          fulfillmentStatus: order.fulfillmentStatus,
          paymentStatus: order.paymentStatus,
          trackingNumber: order.trackingNumber,
          createdAt: order.createdAt
        }
      };

      const connectionTest = await this.printifyService.testConnection();
      debugInfo.printifyConnection = connectionTest;

      if (order.printifyOrderId) {
        try {
          const printifyOrder = await this.printifyService.getOrder(order.printifyOrderId);
          debugInfo.printifyOrder = {
            exists: true,
            status: printifyOrder.status,
            external_id: printifyOrder.external_id,
            shipments: printifyOrder.shipments,
            created_at: printifyOrder.created_at
          };
        } catch (error) {
          debugInfo.printifyOrder = {
            exists: false,
            error: error.message
          };
        }
      } else {
        debugInfo.printifyOrder = { exists: false, error: 'No Printify order ID in database' };
      }

      const recentOrders = await this.printifyService.listAllOrders(10);
      debugInfo.recentPrintifyOrders = recentOrders;

      return { success: true, data: debugInfo };
    } catch (error) {
      logger.error(`❌ Debug order sync failed for order ${orderId}:`, error);
      return { success: false, error: error.message };
    }
  }

  async syncOrderStatusFromPrintify(orderId) {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { 
          user: true,
          items: { include: { product: true } } 
        }
      });

      if (!order) {
        throw new Error(`Order ${orderId} not found in database`);
      }

      if (!order.printifyOrderId) {
        logger.warn(`Order ${orderId} has no Printify order ID. It may not have been forwarded yet.`);
        
        const hoursSinceCreation = (new Date() - new Date(order.createdAt)) / (1000 * 60 * 60);
        if (hoursSinceCreation > 24) {
          await prisma.order.update({
            where: { id: orderId },
            data: { 
              fulfillmentStatus: 'FAILED',
              orderNotes: `Failed to sync with Printify: No Printify order ID after ${Math.round(hoursSinceCreation)} hours`
            }
          });
          throw new Error(`Order ${orderId} never reached Printify after ${Math.round(hoursSinceCreation)} hours`);
        }
        
        throw new Error(`Order ${orderId} not yet forwarded to Printify`);
      }

      logger.info(`🔄 Syncing order ${orderId} from Printify: ${order.printifyOrderId}`);

      const printifyOrder = await this.printifyService.getOrder(order.printifyOrderId);
      
      if (!printifyOrder) {
        throw new Error(`No data received from Printify for order ${order.printifyOrderId}`);
      }

      const newFulfillmentStatus = this.printifyStatusMap[printifyOrder.status] || 'PROCESSING';
      
      const latestShipment = printifyOrder.shipments?.[0];
      const trackingNumber = latestShipment?.number;
      const trackingUrl = latestShipment?.tracking_url;
      const carrier = latestShipment?.carrier;

      const updateData = {
        fulfillmentStatus: newFulfillmentStatus,
        printifyStatus: printifyOrder.status,
        ...(trackingNumber && { trackingNumber }),
        ...(trackingUrl && { trackingUrl }),
        ...(carrier && { carrier }),
        ...(latestShipment?.created_at && { 
          shipmentDate: new Date(latestShipment.created_at) 
        })
      };

      const statusChanged = order.fulfillmentStatus !== newFulfillmentStatus;
      const trackingAdded = !order.trackingNumber && trackingNumber;

      if (Object.keys(updateData).length > 0 && (statusChanged || trackingAdded)) {
        const updatedOrder = await prisma.order.update({
          where: { id: orderId },
          data: updateData,
          include: {
            user: true,
            items: { include: { product: true } }
          }
        });

        if ((statusChanged && newFulfillmentStatus === 'SHIPPED') || trackingAdded) {
          await this.sendShippingNotification(updatedOrder, latestShipment);
        }

        logger.info(`✅ Order ${orderId} status updated from ${order.fulfillmentStatus} to ${newFulfillmentStatus}`);
        return updatedOrder;
      } else {
        logger.info(`ℹ️ Order ${orderId} status unchanged: ${order.fulfillmentStatus}`);
      }

      return order;
    } catch (error) {
      if (error.message.includes('not found') || error.message.includes('404')) {
        logger.warn(`⚠️ Printify order not found for order ${orderId}. Marking for review.`);
        
        await prisma.order.update({
          where: { id: orderId },
          data: { 
            orderNotes: `Sync issue: ${error.message}. Last attempted: ${new Date().toISOString()}`
          }
        });
      }
      
      logger.error(`❌ Failed to sync order ${orderId}:`, error.message);
      throw error;
    }
  }

  async safeSyncOrderStatus(orderId) {
    try {
      return await this.syncOrderStatusFromPrintify(orderId);
    } catch (error) {
      if (error.message.includes('not found') || error.message.includes('404')) {
        logger.warn(`⚠️ Printify order missing for ${orderId}, using cached data: ${error.message}`);
        return await this.getOrderById(orderId);
      }
      throw error;
    }
  }

  async syncAllOrdersStatus() {
    try {
      const pendingOrders = await prisma.order.findMany({
        where: {
          fulfillmentStatus: { in: ['PLACED', 'PROCESSING', 'SHIPPED'] },
          printifyOrderId: { not: null }
        },
        include: { 
          user: true,
          items: { include: { product: true } } 
        }
      });

      logger.info(`🔄 Starting bulk sync for ${pendingOrders.length} orders`);

      const results = await Promise.allSettled(
        pendingOrders.map(order => this.safeSyncOrderStatus(order.id))
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      results.forEach((result, index) => {
        const order = pendingOrders[index];
        if (result.status === 'rejected') {
          logger.error(`❌ Sync failed for order ${order.id}:`, result.reason.message);
        }
      });

      logger.info(`✅ Bulk sync completed: ${successful} successful, ${failed} failed out of ${pendingOrders.length} total`);
      return { successful, failed, total: pendingOrders.length };
    } catch (error) {
      logger.error('❌ Bulk sync failed:', error);
      throw error;
    }
  }

  async getOrderWithTracking(orderId, userId, userRole) {
    const order = await this.getOrderById(orderId);
    
    const isAdmin = userRole === 'admin';
    const isOrderOwner = order.userId === userId;
    
    if (!isAdmin && !isOrderOwner) {
      throw new Error('Access denied');
    }

    if (!['DELIVERED', 'CANCELLED', 'REFUNDED', 'FAILED'].includes(order.fulfillmentStatus)) {
      try {
        const syncedOrder = await this.safeSyncOrderStatus(orderId);
        return syncedOrder;
      } catch (error) {
        logger.warn(`⚠️ Sync failed for order ${orderId}, using cached data: ${error.message}`);
      }
    }

    return order;
  }

  async sendShippingNotification(order, shipment) {
    try {
      const trackingInfo = {
        number: shipment?.number || order.trackingNumber,
        url: shipment?.tracking_url || order.trackingUrl,
        carrier: shipment?.carrier || order.carrier
      };

      await sendMail(
        order.user.email,
        `Your Order #${order.id} Has Shipped! 🚚`,
        getOrderShippedEmail(order, trackingInfo)
      );

      logger.info(`📧 Shipping notification sent for order ${order.id}`);
    } catch (error) {
      logger.error(`❌ Failed to send shipping notification: ${error.message}`);
    }
  }

  async cancelOrder(orderId, reason = "Cancelled by customer", cancelledBy = 'user') {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { 
          user: true,
          items: { include: { product: true } } 
        }
      });

      if (!order) {
        throw new Error("Order not found");
      }

      // Enhanced cancellation validation
      const cancellableStatuses = ['PLACED', 'PENDING', 'PROCESSING'];
      if (!cancellableStatuses.includes(order.fulfillmentStatus)) {
        throw new Error(`Cannot cancel order with status: ${order.fulfillmentStatus}`);
      }

      // Determine refund eligibility
      const isEligibleForRefund = order.paymentStatus === 'SUCCEEDED';
      const refundAmount = isEligibleForRefund ? order.totalAmount : 0;

      // Cancel in Printify first
      let printifyCancellation = { success: false, message: '' };
      if (order.printifyOrderId) {
        try {
          await this.printifyService.cancelOrder(order.printifyOrderId);
          printifyCancellation = { 
            success: true, 
            message: 'Successfully cancelled in Printify' 
          };
          logger.info(`✅ Cancelled Printify order: ${order.printifyOrderId}`);
        } catch (printifyError) {
          printifyCancellation = { 
            success: false, 
            message: `Printify cancellation failed: ${printifyError.message}` 
          };
          logger.warn(`⚠️ Could not cancel Printify order: ${printifyError.message}`);
        }
      }

      // Update order in database with enhanced cancellation data
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
          fulfillmentStatus: 'CANCELLED',
          paymentStatus: isEligibleForRefund ? 'REFUND_PENDING' : 'FAILED',
          orderNotes: `${reason} | Requested by: ${cancelledBy} | Printify: ${printifyCancellation.message}`,
          cancelledAt: new Date(),
          cancellationReason: reason,
          cancelledBy: cancelledBy,
          refundStatus: isEligibleForRefund ? 'PENDING' : 'NOT_REQUIRED',
          refundAmount: refundAmount,
          refundRequestedAt: isEligibleForRefund ? new Date() : null
        },
        include: {
          user: true,
          items: { include: { product: true } }
        }
      });

      // Initiate refund process if eligible
      if (isEligibleForRefund) {
        this.processRefund(updatedOrder, reason).catch(err => {
          logger.error(`❌ Refund processing failed for order ${orderId}:`, err);
        });
      }

      // Send notifications
      await this.sendCancellationNotification(updatedOrder, reason, cancelledBy);

      logger.info(`✅ Order ${orderId} cancelled successfully`);
      return updatedOrder;
    } catch (error) {
      logger.error(`❌ Failed to cancel order ${orderId}:`, error);
      throw error;
    }
  }

async processRefund(order, reason = "Order cancellation") {
  try {
    console.log('🔄 Starting refund process for order:', order.id);
    
    // Enhanced validation
    if (!order.razorpayPaymentId) {
      throw new Error(`No Razorpay payment ID found for order ${order.id}`);
    }

    if (!order.refundAmount || order.refundAmount <= 0) {
      throw new Error(`Invalid refund amount: ${order.refundAmount}`);
    }

    console.log('📋 Refund details:', {
      orderId: order.id,
      paymentId: order.razorpayPaymentId,
      refundAmount: order.refundAmount,
      reason: reason
    });

    // Update refund status to processing
    await prisma.order.update({
      where: { id: order.id },
      data: { refundStatus: 'PROCESSING' }
    });

    // Process refund with Razorpay
    const refund = await this.razorpayService.refundPayment(
      order.razorpayPaymentId, 
      order.refundAmount
    );

    console.log('✅ Razorpay refund successful:', refund.id);

    // Create refund record
    const refundRecord = await prisma.refund.create({
      data: {
        orderId: order.id,
        refundId: refund.id,
        amount: order.refundAmount,
        status: 'COMPLETED',
        reason: reason,
        processedAt: new Date(),
        notes: `Razorpay Refund ID: ${refund.id} | Status: ${refund.status}`
      }
    });

    // Update order with refund details
    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: {
        refundStatus: 'COMPLETED',
        refundProcessedAt: new Date(),
        paymentStatus: 'REFUNDED',
        razorpayRefundId: refund.id,
        orderNotes: `${order.orderNotes} | Refund processed: ${refund.id}`
      },
      include: {
        user: true,
        items: { include: { product: true } }
      }
    });

    logger.info(`✅ Refund processed for order ${order.id}: ${refund.id}`);
    
    // Send refund confirmation
    await this.sendRefundNotification(updatedOrder, refund.id);
    
    return refundRecord;
  } catch (error) {
    console.error('❌ Refund process failed:', error);
    
    // Enhanced error logging
    await prisma.paymentLog.create({
      data: {
        orderId: order.id,
        userId: order.userId,
        paymentId: `refund_failed_${Date.now()}`,
        amount: order.refundAmount,
        status: 'FAILED',
        errorMessage: error.message,
        gateway: 'RAZORPAY',
        rawResponse: { error: error.toString() }
      }
    });

    // Update order with refund failure
    await prisma.order.update({
      where: { id: order.id },
      data: { 
        refundStatus: 'FAILED',
        orderNotes: `${order.orderNotes} | Refund failed: ${error.message}`
      }
    });

    logger.error(`❌ Refund processing failed for order ${order.id}:`, error);
    throw error;
  }
}


  async sendCancellationNotification(order, reason, cancelledBy) {
    try {
      const emailContent = getOrderCancelledEmail(order, reason, cancelledBy);
      
      await sendMail(
        order.user.email,
        `Order #${order.id} Cancelled`,
        emailContent
      );

      // Also notify admin for all cancellations
      await sendMail(
        process.env.ADMIN_EMAIL,
        `Order Cancellation - #${order.id}`,
        `Order #${order.id} has been cancelled by ${cancelledBy}.\n\nReason: ${reason}\nCustomer: ${order.user.name} (${order.user.email})\nAmount: ₹${order.totalAmount}\nRefund Status: ${order.refundStatus}`
      );

      logger.info(`📧 Cancellation notifications sent for order ${order.id}`);
    } catch (error) {
      logger.error(`❌ Failed to send cancellation notification: ${error.message}`);
    }
  }

  async sendRefundNotification(order, refundId) {
    try {
      const emailContent = getRefundProcessedEmail(order, refundId);
      
      await sendMail(
        order.user.email,
        `Refund Processed for Order #${order.id}`,
        emailContent
      );

      logger.info(`📧 Refund notification sent for order ${order.id}`);
    } catch (error) {
      logger.error(`❌ Failed to send refund notification: ${error.message}`);
    }
  }

  async getCancelledOrders(filters = {}) {
    const where = {
      fulfillmentStatus: 'CANCELLED',
      ...filters
    };

    return await prisma.order.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        items: {
          include: {
            product: {
              select: { name: true, price: true }
            }
          }
        },
        refunds: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { cancelledAt: 'desc' }
    });
  }

  async getCancellationStats() {
    const [totalCancelled, pendingRefunds, completedRefunds, cancelledThisMonth] = await Promise.all([
      prisma.order.count({ where: { fulfillmentStatus: 'CANCELLED' } }),
      prisma.order.count({ where: { refundStatus: 'PENDING' } }),
      prisma.order.count({ where: { refundStatus: 'COMPLETED' } }),
      prisma.order.count({
        where: {
          fulfillmentStatus: 'CANCELLED',
          cancelledAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      })
    ]);

    const refundAmount = await prisma.order.aggregate({
      where: { refundStatus: 'COMPLETED' },
      _sum: { refundAmount: true }
    });

    const cancellationReasons = await prisma.order.groupBy({
      by: ['cancellationReason'],
      where: { fulfillmentStatus: 'CANCELLED' },
      _count: { id: true }
    });

    return {
      totalCancelled,
      pendingRefunds,
      completedRefunds,
      cancelledThisMonth,
      totalRefunded: refundAmount._sum.refundAmount || 0,
      cancellationReasons: cancellationReasons.map(cr => ({
        reason: cr.cancellationReason || 'No reason provided',
        count: cr._count.id
      }))
    };
  }

  async retryRefund(orderId) {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { user: true }
      });

      if (!order) {
        throw new Error("Order not found");
      }

      if (order.refundStatus !== 'FAILED') {
        throw new Error(`Refund cannot be retried. Current status: ${order.refundStatus}`);
      }

      if (order.paymentStatus !== 'REFUND_PENDING') {
        throw new Error("Order is not eligible for refund");
      }

      const refund = await this.processRefund(order, "Retry after failed attempt");

      return refund;
    } catch (error) {
      logger.error(`❌ Failed to retry refund for order ${orderId}:`, error);
      throw error;
    }
  }

  // 🔹 NEW: Send cancellation notification
  async sendCancellationNotification(order, reason) {
    try {
      const emailContent = `
        <h2>Order Cancelled</h2>
        <p>Your order #${order.id} has been cancelled.</p>
        <p><strong>Reason:</strong> ${reason}</p>
        <p><strong>Cancelled on:</strong> ${new Date().toLocaleDateString()}</p>
        ${order.paymentStatus === 'REFUNDED' ? 
          '<p>Your payment will be refunded within 5-7 business days.</p>' : 
          ''}
      `;

      await sendMail(
        order.user.email,
        `Order #${order.id} Cancelled`,
        emailContent
      );

      logger.info(`📧 Cancellation notification sent for order ${order.id}`);
    } catch (error) {
      logger.error(`❌ Failed to send cancellation notification: ${error.message}`);
    }
  }

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

async getAllOrders(filters = {}) {
  const {
    page = 1,
    limit = 5,
    search = '',
    status = '',
    paymentStatus = '',
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = filters;

  const skip = (page - 1) * limit;
  
  // Build where clause for filtering
  const where = {};
  
  if (status && status !== 'all') {
    where.fulfillmentStatus = status;
  }
  
  if (paymentStatus && paymentStatus !== 'all') {
    where.paymentStatus = paymentStatus;
  }
  
  if (search) {
    const searchTerm = search.trim();
    const orderId = parseInt(searchTerm);
    
    where.OR = [
      // Search by order ID (numeric)
      ...(isNaN(orderId) ? [] : [
        { id: { equals: orderId } },
        { razorpayOrderId: { contains: searchTerm, mode: 'insensitive' } }
      ]),
      // Search by string order identifiers
      { razorpayOrderId: { contains: searchTerm, mode: 'insensitive' } },
      { printifyOrderId: { contains: searchTerm, mode: 'insensitive' } },
      { trackingNumber: { contains: searchTerm, mode: 'insensitive' } },
      // Search by user information
      { 
        user: {
          OR: [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { email: { contains: searchTerm, mode: 'insensitive' } },
            { phone: { contains: searchTerm, mode: 'insensitive' } }
          ]
        }
      },
      // Search in product names through order items
      {
        items: {
          some: {
            product: {
              name: { contains: searchTerm, mode: 'insensitive' }
            }
          }
        }
      }
    ].filter(Boolean); // Remove any empty arrays from spread
  }

  // Get orders with pagination
  const orders = await prisma.order.findMany({
    where,
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
    orderBy: { [sortBy]: sortOrder },
    skip,
    take: limit,
  });

  // Get total count for pagination
  const totalCount = await prisma.order.count({ where });
  const totalPages = Math.ceil(totalCount / limit);

  return {
    orders,
    pagination: {
      currentPage: page,
      totalPages,
      totalCount,
      hasNext: page < totalPages,
      hasPrev: page > 1,
      limit: parseInt(limit)
    }
  };
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

  async retryPrintifyForwarding(orderId) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: true,
        items: { include: { product: true } },
      },
    });

    if (!order) throw new Error("Order not found");
    if (order.printifyOrderId) throw new Error("Already forwarded to Printify");

    const printifyItems = order.items.map((item) => ({
      ...item,
      printifyProductId: item.product.printifyProductId,
      sku: item.product.sku,
    }));

    const printifyOrder = await this.printifyService.createOrder({
      orderId: order.id,
      items: printifyItems,
      shippingAddress: order.shippingAddress,
      orderImage: order.orderImage,
    });

    await prisma.order.update({
      where: { id: orderId },
      data: { printifyOrderId: printifyOrder.id, fulfillmentStatus: "PROCESSING" },
    });

    logger.info(`✅ Retry successful: Order ${orderId} forwarded as ${printifyOrder.id}`);
    return printifyOrder.id;
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