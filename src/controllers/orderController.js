// src/controllers/orderController.js
import { OrderService } from "../services/orderService.js";
import { CreateOrderDto, OrderResponseDto } from "../dto/orderDto.js";
import { successResponse, errorResponse } from "../utils/responseHandler.js";
import HttpStatus from "../constants/httpStatusCode.js";
import { socketEvents } from "../config/socket.js";

const orderService = new OrderService();

export async function createOrder(req, res) {
  try {
    const userId = req.user.id;
    const orderData = new CreateOrderDto(req.body);
    
    const validationErrors = orderData.validate();
    if (validationErrors.length > 0) {
      return errorResponse(res, validationErrors.join(", "), HttpStatus.BAD_REQUEST);
    }

    const order = await orderService.createOrder(userId, orderData);
    
    // ✅ Correct event
    socketEvents.emitNewOrder(OrderResponseDto.fromOrder(order));

    return successResponse(
      res, 
      OrderResponseDto.fromOrder(order), 
      "Order created successfully", 
      HttpStatus.CREATED
    );
  } catch (error) {
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

export async function   getAllOrders(req, res) {
  try {
    const orders = await orderService.getAllOrders();
    
    return successResponse(
      res, 
      orders.map(OrderResponseDto.fromOrder), 
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
    
    // ❌ Wrong
    // req.io.emit('orderUpdated', OrderResponseDto.fromOrder(order));

    // ✅ Correct
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


// src/controllers/orderController.js - Add this function
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

// In orderController.js - Update these functions to use class methods
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

    // Remove undefined values
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

// src/controllers/orderController.js - Add this function
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

    // ✅ FIX: Allow admins to access any order, users only their own
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


// src/controllers/orderController.js - Add this function
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