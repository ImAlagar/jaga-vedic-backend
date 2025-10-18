// src/controllers/orderController.js
import { OrderService } from "../services/orderService.js";
import { CreateOrderDto, OrderResponseDto, OrderTrackingDto } from "../dto/orderDto.js";
import { successResponse, errorResponse } from "../utils/responseHandler.js";
import HttpStatus from "../constants/httpStatusCode.js";
import { socketEvents } from "../config/socket.js";
import prisma from "../config/prisma.js";
import printifyShippingService from "../services/printifyShippingService.js";
import { taxService } from "../services/taxService.js";
import { couponService } from "../services/couponService.js";

const orderService = new OrderService();

export async function createOrder(req, res) {
  try {
    // Check authentication
    if (!req.user || !req.user.id) {
      return errorResponse(res, 'Authentication required', HttpStatus.UNAUTHORIZED);
    }

    const userId = req.user.id;
    const orderData = new CreateOrderDto(req.body);
    
    // Validate DTO
    const validationErrors = orderData.validate();
    if (validationErrors.length > 0) {
      return errorResponse(res, validationErrors.join(", "), HttpStatus.BAD_REQUEST);
    }

    
    // ✅ FIXED: Call the service method with proper parameters
    const order = await orderService.createOrder(userId, orderData);
    

    // Emit socket event
    socketEvents.emitNewOrder(OrderResponseDto.fromOrder(order));

    return successResponse(
      res, 
      OrderResponseDto.fromOrder(order), 
      "Order created successfully", 
      HttpStatus.CREATED
    );
  } catch (error) {
    console.error('❌ CONTROLLER - Order creation error:', error);
    return errorResponse(res, error.message, HttpStatus.BAD_REQUEST);
  }
}

export async function getUserOrders(req, res) {
  try {
    if (!req.user || !req.user.id) {
      return errorResponse(res, "User authentication required", HttpStatus.UNAUTHORIZED);
    }
    
    const userId = req.user.id;
    const orders = await orderService.getUserOrders(userId);
    
    return successResponse(
      res, 
      orders.map(OrderResponseDto.fromOrder), 
      'Orders fetched successfully'
    );
  } catch (error) {
    return errorResponse(res, error.message, HttpStatus.BAD_REQUEST);
  }
}

export async function getAllOrders(req, res) {
  try {
    const {
      page = 1,
      limit = 5,
      search = '',
      status = '',
      paymentStatus = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const result = await orderService.getAllOrders({
      page: parseInt(page),
      limit: parseInt(limit),
      search,
      status,
      paymentStatus,
      sortBy,
      sortOrder
    });
    
    return successResponse(
      res, 
      {
        orders: result.orders.map(OrderResponseDto.fromOrder),
        pagination: result.pagination
      },
      'Orders fetched successfully'
    );
  } catch (error) {
    return errorResponse(res, error.message, HttpStatus.BAD_REQUEST);
  }
}

export async function updateOrderStatus(req, res) {
  try {
    const { orderId } = req.params;
    const statusData = req.body;
    
    const order = await orderService.updateOrderStatus(parseInt(orderId), statusData);
    
    socketEvents.emitOrderUpdate(OrderResponseDto.fromOrder(order));

    return successResponse(
      res, 
      OrderResponseDto.fromOrder(order), 
      'Order status updated successfully'
    );
  } catch (error) {
    return errorResponse(res, error.message, HttpStatus.BAD_REQUEST);
  }
}

export async function retryPrintifyForwarding(req, res) {
  try {
    const { orderId } = req.params;
    
    if (!orderId || isNaN(orderId)) {
      return errorResponse(res, "Valid order ID is required", HttpStatus.BAD_REQUEST);
    }

    const printifyOrderId = await orderService.retryPrintifyForwarding(parseInt(orderId));
    
    return successResponse(
      res, 
      { printifyOrderId }, 
      'Order successfully forwarded to Printify', 
      HttpStatus.OK
    );
  } catch (error) {
    return errorResponse(res, error.message, HttpStatus.BAD_REQUEST);
  }
}

export async function getOrderStats(req, res) {
  try {
    const stats = await orderService.getOrderStats();
    
    return successResponse(
      res, 
      stats, 
      'Order statistics fetched successfully'
    );
  } catch (error) {
    return errorResponse(res, error.message, HttpStatus.BAD_REQUEST);
  }
}

export async function filterOrders(req, res) {
  try {
    const {
      status,
      paymentStatus,
      search,
      startDate,
      endDate,
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc"
    } = req.query;

    const filters = {
      ...(status && status !== 'all' && { fulfillmentStatus: status }),
      ...(paymentStatus && paymentStatus !== 'all' && { paymentStatus }),
      ...(search && {
        OR: [
          { id: isNaN(parseInt(search)) ? undefined : parseInt(search) },
          { stripePaymentIntentId: { contains: search, mode: 'insensitive' } },
          { 
            user: {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } }
              ]
            }
          }
        ].filter(Boolean)
      }),
      ...(startDate && endDate && {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      })
    };

    Object.keys(filters).forEach(key => {
      if (filters[key] === undefined) {
        delete filters[key];
      }
    });

    const result = await orderService.getFilteredOrders(filters, {
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy,
      sortOrder
    });

    return successResponse(res, result, "Orders filtered successfully", HttpStatus.OK);
  } catch (error) {
    return errorResponse(res, error.message, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

export async function getOrderFilters(req, res) {
  try {
    const filters = await orderService.getAvailableFilters();
    return successResponse(res, filters, "Order filters retrieved successfully", HttpStatus.OK);
  } catch (error) {
    return errorResponse(res, error.message, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

export async function getOrderById(req, res) {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    if (!orderId || isNaN(orderId)) {
      return errorResponse(res, "Valid order ID is required", HttpStatus.BAD_REQUEST);
    }

    const order = await orderService.getOrderById(parseInt(orderId));
    
    if (!order) {
      return errorResponse(res, "Order not found", HttpStatus.NOT_FOUND);
    }

    const isAdmin = userRole === 'admin';
    const isOrderOwner = order.userId === userId;
    
    if (!isAdmin && !isOrderOwner) {
      return errorResponse(res, "Access denied", HttpStatus.FORBIDDEN);
    }

    return successResponse(
      res, 
      OrderResponseDto.fromOrder(order), 
      'Order fetched successfully'
    );
  } catch (error) {
    return errorResponse(res, error.message, HttpStatus.BAD_REQUEST);
  }
}

export async function getAdminOrderById(req, res) {
  try {
    const { orderId } = req.params;
    
    if (!orderId || isNaN(orderId)) {
      return errorResponse(res, "Valid order ID is required", HttpStatus.BAD_REQUEST);
    }

    const order = await orderService.getOrderById(parseInt(orderId));
    
    if (!order) {
      return errorResponse(res, "Order not found", HttpStatus.NOT_FOUND);
    }

    return successResponse(
      res, 
      OrderResponseDto.fromOrder(order), 
      'Order fetched successfully'
    );
  } catch (error) {
    return errorResponse(res, error.message, HttpStatus.BAD_REQUEST);
  }
}

export async function getOrderTracking(req, res) {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!orderId || isNaN(orderId)) {
      return errorResponse(res, "Valid order ID is required", HttpStatus.BAD_REQUEST);
    }

    const order = await orderService.getOrderWithTracking(
      parseInt(orderId), 
      userId, 
      userRole
    );

    const trackingResponse = OrderTrackingDto.fromOrder(order);

    return successResponse(
      res, 
      trackingResponse, 
      'Tracking information fetched successfully'
    );
  } catch (error) {
    return errorResponse(res, error.message, HttpStatus.BAD_REQUEST);
  }
}

export async function syncOrderStatus(req, res) {
  try {
    const { orderId } = req.params;
    const userRole = req.user.role;

    if (!orderId || isNaN(orderId)) {
      return errorResponse(res, "Valid order ID is required", HttpStatus.BAD_REQUEST);
    }

    if (userRole !== 'admin') {
      return errorResponse(res, "Access denied", HttpStatus.FORBIDDEN);
    }

    const order = await orderService.syncOrderStatusFromPrintify(parseInt(orderId));
    
    socketEvents.emitOrderUpdate(OrderTrackingDto.fromOrder(order));

    return successResponse(
      res, 
      OrderTrackingDto.fromOrder(order), 
      'Order status synced successfully'
    );
  } catch (error) {
    return errorResponse(res, error.message, HttpStatus.BAD_REQUEST);
  }
}

export async function bulkSyncOrders(req, res) {
  try {
    const userRole = req.user.role;

    if (userRole !== 'admin') {
      return errorResponse(res, "Access denied", HttpStatus.FORBIDDEN);
    }

    const result = await orderService.syncAllOrdersStatus();
    
    return successResponse(
      res, 
      result, 
      'Bulk order sync completed successfully'
    );
  } catch (error) {
    return errorResponse(res, error.message, HttpStatus.BAD_REQUEST);
  }
}

export async function cancelOrder(req, res) {
  const startTime = Date.now();
  
  try {
    const { orderId } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;
    if (!orderId || isNaN(orderId)) {
      return errorResponse(res, "Valid order ID is required", HttpStatus.BAD_REQUEST);
    }

    const order = await orderService.getOrderById(parseInt(orderId));
    
    if (!order) {
      return errorResponse(res, "Order not found", HttpStatus.NOT_FOUND);
    }

    // Authorization: Users can only cancel their own orders, admins can cancel any
    const isAdmin = userRole === 'admin';
    const isOrderOwner = order.userId === userId;
    
    if (!isAdmin && !isOrderOwner) {
      return errorResponse(res, "Access denied", HttpStatus.FORBIDDEN);
    }

    // Process cancellation (this should be optimized to be fast)
    const cancelledOrder = await orderService.cancelOrder(
      parseInt(orderId), 
      reason || "Cancelled by user",
      isAdmin ? 'admin' : 'user'
    );

    const processingTime = Date.now() - startTime;

    // Send immediate response - don't wait for async operations
    const responseData = {
      success: true,
      message: 'Order cancelled successfully',
      data: OrderResponseDto.fromOrder(cancelledOrder),
      processingTime: `${processingTime}ms`,
      refundInfo: cancelledOrder.refundStatus === 'PENDING' 
        ? 'Refund will be processed in the background'
        : 'No refund required'
    };

    // Send response immediately
    return successResponse(
      res, 
      responseData, 
      'Order cancelled successfully'
    );

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    console.error('❌ Backend: Order cancellation failed', {
      orderId: req.params.orderId,
      error: error.message,
      processingTime: `${processingTime}ms`,
      stack: error.stack
    });

    return errorResponse(res, error.message, HttpStatus.BAD_REQUEST);
  }
}

export async function adminCancelOrder(req, res) {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;

    if (!orderId || isNaN(orderId)) {
      return errorResponse(res, "Valid order ID is required", HttpStatus.BAD_REQUEST);
    }

    const order = await orderService.getOrderById(parseInt(orderId));
    
    if (!order) {
      return errorResponse(res, "Order not found", HttpStatus.NOT_FOUND);
    }

    const cancelledOrder = await orderService.cancelOrder(
      parseInt(orderId), 
      reason || "Cancelled by admin",
      'admin'
    );

    socketEvents.emitOrderUpdate(OrderResponseDto.fromOrder(cancelledOrder));

    return successResponse(
      res, 
      OrderResponseDto.fromOrder(cancelledOrder), 
      'Order cancelled successfully'
    );
  } catch (error) {
    return errorResponse(res, error.message, HttpStatus.BAD_REQUEST);
  }
}

export async function getCancelledOrders(req, res) {
  try {
    const { 
      page = 1, 
      limit = 10, 
      refundStatus,
      startDate,
      endDate 
    } = req.query;
    
    const filters = {
      fulfillmentStatus: 'CANCELLED',
      ...(refundStatus && refundStatus !== 'all' && { refundStatus }),
      ...(startDate && endDate && {
        cancelledAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      })
    };

    const result = await orderService.getFilteredOrders(filters, {
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy: 'cancelledAt',
      sortOrder: 'desc'
    });

    // Use OrderResponseDto instead of CancelledOrderDto temporarily
    const transformedData = {
      ...result,
      data: result.data.map(order => OrderResponseDto.fromOrder(order))
    };

    return successResponse(res, transformedData, "Cancelled orders fetched successfully");
  } catch (error) {
    return errorResponse(res, error.message, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

export async function getCancellationStats(req, res) {
  try {
    const stats = await orderService.getCancellationStats();
    return successResponse(res, stats, "Cancellation statistics fetched successfully");
  } catch (error) {
    return errorResponse(res, error.message, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

export async function processRefund(req, res) {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;
    
    if (!orderId || isNaN(orderId)) {
      return errorResponse(res, "Valid order ID is required", HttpStatus.BAD_REQUEST);
    }

    const order = await orderService.getOrderById(parseInt(orderId));
    
    if (!order) {
      return errorResponse(res, "Order not found", HttpStatus.NOT_FOUND);
    }

    if (order.refundStatus !== 'PENDING') {
      return errorResponse(res, `Refund cannot be processed. Current status: ${order.refundStatus}`, HttpStatus.BAD_REQUEST);
    }

    const refund = await orderService.processRefund(order, reason || "Manual refund processing");

    return successResponse(res, refund, "Refund processed successfully");
  } catch (error) {
    return errorResponse(res, error.message, HttpStatus.BAD_REQUEST);
  }
}

export async function retryRefund(req, res) {
  try {
    const { orderId } = req.params;
    
    if (!orderId || isNaN(orderId)) {
      return errorResponse(res, "Valid order ID is required", HttpStatus.BAD_REQUEST);
    }

    const refund = await orderService.retryRefund(parseInt(orderId));

    return successResponse(res, refund, "Refund retried successfully");
  } catch (error) {
    return errorResponse(res, error.message, HttpStatus.BAD_REQUEST);
  }
}


// Add to your orderController.js
export async function resetRefundStatus(req, res) {
  try {
    const { orderId } = req.params;
    
    if (!orderId || isNaN(orderId)) {
      return errorResponse(res, "Valid order ID is required", HttpStatus.BAD_REQUEST);
    }

    const order = await orderService.getOrderById(parseInt(orderId));
    
    if (!order) {
      return errorResponse(res, "Order not found", HttpStatus.NOT_FOUND);
    }

    // Reset refund status to PENDING
    const updatedOrder = await prisma.order.update({
      where: { id: parseInt(orderId) },
      data: { 
        refundStatus: 'PENDING'
      },
      include: {
        user: true,
        items: { include: { product: true } }
      }
    });

    return successResponse(
      res, 
      OrderResponseDto.fromOrder(updatedOrder), 
      'Refund status reset to PENDING'
    );
  } catch (error) {
    return errorResponse(res, error.message, HttpStatus.BAD_REQUEST);
  }
}


