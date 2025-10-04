import paymentService from '../services/paymentService.js';
import { successResponse, errorResponse } from '../utils/responseHandler.js';
import prisma from '../config/prisma.js';
import logger from '../utils/logger.js';

export async function createPaymentOrder(req, res) {
  try {
    const { orderId } = req.body;
    const userId = req.user.id;

    if (!orderId) {
      return errorResponse(res, 'Order ID is required', 400);
    }

    // Fetch order details
    const order = await prisma.order.findUnique({
      where: { id: parseInt(orderId) },
      include: {
        items: {
          include: {
            product: true
          }
        },
        user: true
      }
    });

    if (!order) {
      return errorResponse(res, 'Order not found', 404);
    }

    if (order.userId !== userId) {
      return errorResponse(res, 'Unauthorized access', 403);
    }

    const paymentOrder = await paymentService.initiatePayment({
      orderId: order.id,
      amount: order.totalAmount,
      currency: 'INR',
      userId: userId,
      products: order.items
    });

    logger.info('Payment order created', { orderId, userId });

    return successResponse(
      res, 
      paymentOrder, 
      'Payment order created successfully', 
      200
    );
  } catch (error) {
    logger.error('Create payment order failed', { error: error.message });
    return errorResponse(res, error.message, 400);
  }
}

export async function verifyPayment(req, res) {
  try {
    const { 
      razorpay_payment_id, 
      razorpay_order_id, 
      razorpay_signature,
      orderId 
    } = req.body;

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return errorResponse(res, 'Payment verification data incomplete', 400);
    }

    const result = await paymentService.verifyAndCapturePayment({
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature
    });

    logger.info('Payment verified successfully', { 
      orderId: result.order.id,
      paymentId: razorpay_payment_id 
    });

    return successResponse(
      res, 
      result, 
      'Payment verified successfully', 
      200
    );
  } catch (error) {
    logger.error('Payment verification failed', { error: error.message });
    
    // Mark payment as failed
    if (req.body.orderId) {
      await paymentService.handlePaymentFailure(
        req.body.orderId, 
        error.message
      );
    }

    return errorResponse(res, error.message, 400);
  }
}

export async function getPaymentStatus(req, res) {
  try {
    const { orderId } = req.params;

    const paymentStatus = await paymentService.getPaymentStatus(parseInt(orderId));

    return successResponse(
      res, 
      paymentStatus, 
      'Payment status retrieved', 
      200
    );
  } catch (error) {
    logger.error('Get payment status failed', { error: error.message });
    return errorResponse(res, error.message, 400);
  }
}

export async function processRefund(req, res) {
  try {
    const { orderId } = req.params;
    const { amount, reason } = req.body;

    const refund = await paymentService.processRefund(parseInt(orderId), amount, reason);

    return successResponse(
      res, 
      refund, 
      'Refund processed successfully', 
      200
    );
  } catch (error) {
    logger.error('Refund processing failed', { error: error.message });
    return errorResponse(res, error.message, 400);
  }
}