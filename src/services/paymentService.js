// src/services/paymentService.js
import prisma from "../config/prisma.js";
import Razorpay from "razorpay";
import crypto from "crypto";
import { sendMail } from "../utils/mailer.js";
import { getPaymentSuccessEmail, getPaymentFailedEmail } from "../utils/emailTemplates.js";
import logger from "../utils/logger.js";

export class PaymentService {
  constructor() {
    this.razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

  }

  async createRazorpayOrder(orderId, userId) {
    try {
      // Get order with currency info and shipping address
      const order = await prisma.order.findFirst({
        where: { 
          id: parseInt(orderId),
          userId: userId 
        },
        include: {
          user: { select: { email: true } },
          shipping: true
        }
      });

      if (!order) {
        throw new Error("Order not found or access denied");
      }

      // Get user's country from shipping address
      const userCountry = order.shippingAddress?.country || 'US';

      // Determine currency based on user location
      let razorpayAmount, razorpayCurrency, displayAmount, displayCurrency;

      if (userCountry === 'IN') {
        // Indian customers pay in INR
        razorpayAmount = order.totalAmount;
        razorpayCurrency = "INR";
        displayAmount = order.totalAmount;
        displayCurrency = "INR";
      } else {
        // International customers - convert to INR for Razorpay
        razorpayAmount = order.totalAmount;
        razorpayCurrency = "INR";
        displayAmount = order.originalAmount || (order.totalAmount / order.exchangeRate);
        displayCurrency = "USD";
      }

      const options = {
        amount: Math.round(razorpayAmount * 100), // Convert to paise
        currency: razorpayCurrency,
        receipt: `order_${order.id}`,
        notes: {
          orderId: order.id.toString(),
          userId: userId.toString(),
          displayAmount: displayAmount,
          displayCurrency: displayCurrency,
          chargedAmount: razorpayAmount,
          chargedCurrency: razorpayCurrency,
          userCountry: userCountry,
          exchangeRate: order.exchangeRate
        }
      };

      const razorpayOrder = await this.razorpay.orders.create(options);

      // Update order with Razorpay order ID
      await prisma.order.update({
        where: { id: order.id },
        data: { 
          razorpayOrderId: razorpayOrder.id,
          paymentStatus: "PENDING"
        }
      });

      return {
        id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        key: process.env.RAZORPAY_KEY_ID,
        displayAmount: parseFloat(displayAmount.toFixed(2)),
        displayCurrency: displayCurrency,
        userCountry: userCountry
      };
    } catch (error) {
      console.error(`Payment order creation failed: ${error.message}`);
      throw error;
    }
  }


  // 🔥 OPTIMIZED: Faster payment verification
async verifyRazorpayPayment(paymentData, userId) {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = paymentData;

    try {
      // Verify signature FIRST (fast operation)
      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(razorpay_order_id + "|" + razorpay_payment_id)
        .digest("hex");

      if (expectedSignature !== razorpay_signature) {
        await this.updateOrderPaymentStatus(parseInt(orderId), "FAILED", "Signature verification failed");
        throw new Error("Payment verification failed");
      }

      // Get order with only necessary fields
      const order = await prisma.order.findFirst({
        where: { 
          id: parseInt(orderId),
          userId: userId,
          razorpayOrderId: razorpay_order_id
        },
        select: {
          id: true,
          paymentStatus: true,
          user: { select: { email: true } }
        }
      });

      if (!order) {
        throw new Error("Order not found or access denied");
      }

      if (order.paymentStatus === "SUCCEEDED") {
        return { success: true, message: "Payment already verified" };
      }

      // Update order status
      const updatedOrder = await prisma.order.update({
        where: { id: parseInt(orderId) },
        data: { 
          paymentStatus: "SUCCEEDED",
          razorpayPaymentId: razorpay_payment_id,
          fulfillmentStatus: "PROCESSING"
        },
        select: {
          id: true,
          totalAmount: true,
          paymentStatus: true,
          user: { select: { email: true } }
        }
      });

      // Send email in background (don't wait)
      this.sendPaymentSuccessEmail(updatedOrder).catch(error => 
        logger.error('Email sending failed:', error)
      );

      logger.info(`✅ Payment verified for order ${orderId}`);

      return {
        success: true,
        order: updatedOrder,
        paymentId: razorpay_payment_id
      };

    } catch (error) {
      logger.error(`❌ Payment verification failed: ${error.message}`);
      
      // Update order status in background
      this.updateOrderPaymentStatus(parseInt(orderId), "FAILED", error.message)
        .catch(err => logger.error('Status update failed:', err));

      throw error;
    }
}

  // 🔥 NEW: Separate method for order status update
  async updateOrderPaymentStatus(orderId, status, errorMessage = null) {
    const updateData = { paymentStatus: status };
    if (errorMessage) {
      updateData.paymentError = errorMessage;
    }
    
    return await prisma.order.update({
      where: { id: orderId },
      data: updateData
    });
  }

  // 🔥 NEW: Async email sending (non-blocking)
async sendPaymentSuccessEmail(order) {
  try {
    // 🔥 FIX: Correct Prisma query - shippingAddress is a scalar field, not a relation
    const completeOrder = await prisma.order.findUnique({
      where: { id: order.id },
      include: {
        items: {
          include: {
            product: {
              select: {
                name: true,
                images: true
              }
            }
          }
        },
        user: {
          select: {
            email: true,
            name: true
          }
        }
        // shippingAddress is already included as scalar fields in Order model
      }
    });

    if (!completeOrder) {
      logger.error(`Order not found for email: ${order.id}`);
      return;
    }

    const emailContent = await getPaymentSuccessEmail(completeOrder);
    await sendMail(
      completeOrder.user.email,
      `Payment Successful - Order #${completeOrder.id}`,
      emailContent
    );
    
    logger.info(`✅ Payment success email sent for order ${completeOrder.id}`);
  } catch (error) {
    logger.error(`Email failed for order ${order?.id}:`, error);
    // Don't throw error to prevent breaking payment flow
  }
}

  // 🔥 OPTIMIZED: Webhook handlers with faster operations
  async handlePaymentCaptured(payment) {
    try {
      // Update directly without fetching first (faster)
      const updatedOrder = await prisma.order.updateMany({
        where: { 
          razorpayOrderId: payment.order_id,
          paymentStatus: { not: "SUCCEEDED" }
        },
        data: { 
          paymentStatus: "SUCCEEDED",
          razorpayPaymentId: payment.id,
          fulfillmentStatus: "PROCESSING"
        }
      });

      if (updatedOrder.count > 0) {
        logger.info(`✅ Payment captured via webhook for order ${payment.order_id}`);
        
        // Get order details for email (in background)
        this.sendWebhookSuccessEmail(payment.order_id).catch(error => 
          logger.error('Webhook email failed:', error)
        );
      }
    } catch (error) {
      logger.error(`❌ Payment captured webhook error: ${error.message}`);
    }
  }

  async sendWebhookSuccessEmail(razorpayOrderId) {
    const order = await prisma.order.findFirst({
      where: { razorpayOrderId },
      include: { user: { select: { email: true } } }
    });
    
    if (order && order.user) {
      await sendMail(
        order.user.email,
        `Payment Successful - Order #${order.id}`,
        getPaymentSuccessEmail(order)
      );
    }
  }

  // 🔥 OPTIMIZED: Get payment status with minimal data
  async getPaymentStatus(orderId, userId) {
    const order = await prisma.order.findFirst({
      where: { 
        id: parseInt(orderId),
        userId: userId 
      },
      select: {
        id: true,
        paymentStatus: true,
        fulfillmentStatus: true,
        razorpayOrderId: true,
        razorpayPaymentId: true,
        totalAmount: true,
        createdAt: true
      }
    });

    if (!order) {
      throw new Error("Order not found");
    }

    return order;
  }

  // 🔥 NEW: Health check for Razorpay
  async checkRazorpayHealth() {
    try {
      await Promise.race([
        this.razorpay.orders.all({ count: 1 }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Razorpay health check timeout")), 5000)
        )
      ]);
      return true;
    } catch (error) {
      logger.error('Razorpay health check failed:', error);
      return false;
    }
  }
}