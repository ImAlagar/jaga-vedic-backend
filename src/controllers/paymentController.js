import { PaymentService } from "../services/paymentService.js";
import { successResponse, errorResponse } from "../utils/responseHandler.js";
import HttpStatus from "../constants/httpStatusCode.js";
import crypto from 'crypto';

const paymentService = new PaymentService();

export const createPaymentOrder = async (req, res) => {
  try {
    const orderData = req.body;
    const userId = req.user.id;

    if (!orderData || !orderData.items || !orderData.shippingAddress) {
      return errorResponse(res, "Order data is required", HttpStatus.BAD_REQUEST);
    }

    const paymentOrder = await paymentService.createRazorpayOrder(orderData, userId);
    
    return successResponse(
      res, 
      paymentOrder, 
      "Payment order created successfully"
    );

  } catch (error) {
    console.error('❌ Payment order creation failed:', error);
    return errorResponse(res, error.message, HttpStatus.BAD_REQUEST);
  }
}

export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
    const userId = req.user.id;



    // Validate required fields
    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return errorResponse(res, "Missing payment verification data", HttpStatus.BAD_REQUEST);
    }

    const verification = await paymentService.verifyRazorpayPayment({
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature
    }, userId);



    return successResponse(
      res, 
      verification, 
      "Payment verified successfully"
    );

  } catch (error) {
    console.error('❌ Payment verification failed in controller:', error);
    return errorResponse(res, error.message, HttpStatus.BAD_REQUEST);
  }
};

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
      console.error('Webhook processing error:', error)
    );

    res.status(200).send('Webhook received successfully');
  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    res.status(500).send('Webhook processing failed');
  }
}

export const getPaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;

    if (!orderId || isNaN(parseInt(orderId))) {
      return errorResponse(res, "Invalid Order ID", HttpStatus.BAD_REQUEST);
    }

    const status = await paymentService.getPaymentStatus(orderId, userId);
    
    return successResponse(
      res, 
      status, 
      "Payment status fetched successfully"
    );

  } catch (error) {
    return errorResponse(res, error.message, HttpStatus.BAD_REQUEST);
  }
};