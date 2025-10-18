// src/controllers/paymentController.js
import { PaymentService } from "../services/paymentService.js";
import { successResponse, errorResponse } from "../utils/responseHandler.js";
import HttpStatus from "../constants/httpStatusCode.js";
import crypto from 'crypto';

const paymentService = new PaymentService();

// 🔥 OPTIMIZED: Add timeout wrapper
const withTimeout = (fn, timeoutMs = 10000) => {
  return async (req, res) => {
    const timeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error(`Request timeout after ${timeoutMs}ms`)), timeoutMs)
    );

    try {
      const result = await Promise.race([fn(req, res), timeout]);
      return result;
    } catch (error) {
      if (error.message.includes('timeout')) {
        return errorResponse(res, "Request timeout, please try again", HttpStatus.REQUEST_TIMEOUT);
      }
      throw error;
    }
  };
};

export const createPaymentOrder = withTimeout(async (req, res) => {
  const { orderId } = req.body;
  const userId = req.user.id;

  if (!orderId) {
    return errorResponse(res, "Order ID is required", HttpStatus.BAD_REQUEST);
  }

  // Quick validation
  if (isNaN(parseInt(orderId))) {
    return errorResponse(res, "Invalid Order ID", HttpStatus.BAD_REQUEST);
  }

  const paymentOrder = await paymentService.createRazorpayOrder(orderId, userId);
  return successResponse(res, paymentOrder, "Payment order created successfully");
}, 15000);

// In your paymentController.js - verifyPayment function
export const verifyPayment = withTimeout(async (req, res) => {
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature, orderId } = req.body;
  const userId = req.user.id;

  // Quick validation
  if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !orderId) {
    console.error('❌ BACKEND - Missing verification data:', {
      missing: {
        razorpay_payment_id: !razorpay_payment_id,
        razorpay_order_id: !razorpay_order_id,
        razorpay_signature: !razorpay_signature,
        orderId: !orderId
      }
    });
    return errorResponse(res, "Missing payment verification data", HttpStatus.BAD_REQUEST);
  }

  try {
    const verification = await paymentService.verifyRazorpayPayment({
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      orderId
    }, userId);

    return successResponse(res, verification, "Payment verified successfully");
  } catch (error) {
    console.error('❌ BACKEND - Verification service error:', error);
    return errorResponse(res, error.message, HttpStatus.BAD_REQUEST);
  }
}, 15000);
// Webhook doesn't need timeout as it's async
export async function handlePaymentWebhook(req, res) {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'];

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (signature !== expectedSignature) {
      console.error('❌ Webhook signature verification failed');
      return res.status(400).send('Webhook signature verification failed');
    }

    // Process webhook in background
    paymentService.handleWebhookEvent(req.body).catch(error => 
      logger.error('Webhook processing error:', error)
    );

    // Respond immediately
    res.status(200).send('Webhook received successfully');
  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    res.status(500).send('Webhook processing failed');
  }
}

export const getPaymentStatus = withTimeout(async (req, res) => {
  const { orderId } = req.params;
  const userId = req.user.id;

  if (!orderId || isNaN(parseInt(orderId))) {
    return errorResponse(res, "Invalid Order ID", HttpStatus.BAD_REQUEST);
  }

  const status = await paymentService.getPaymentStatus(orderId, userId);
  return successResponse(res, status, "Payment status fetched successfully");
}, 10000); // 10 seconds timeout

// 🔥 NEW: Health check endpoint
export const healthCheck = async (req, res) => {
  const razorpayHealth = await paymentService.checkRazorpayHealth();
  
  return successResponse(res, {
    server: 'healthy',
    razorpay: razorpayHealth ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString()
  }, "Service health status");
};