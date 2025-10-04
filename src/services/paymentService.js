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

  // Create Razorpay order
  async createRazorpayOrder(orderId, userId) {
    try {
      // Verify order exists and belongs to user
      const order = await prisma.order.findFirst({
        where: { 
          id: parseInt(orderId),
          userId: userId 
        },
        include: { user: true }
      });

      if (!order) {
        throw new Error("Order not found or access denied");
      }

      if (order.paymentStatus === "SUCCEEDED") {
        throw new Error("Payment already completed for this order");
      }

      // Create Razorpay order
      const options = {
        amount: Math.round(order.totalAmount * 100), // Convert to paise
        currency: "INR",
        receipt: `order_${order.id}`,
        notes: {
          orderId: order.id.toString(),
          userId: userId.toString()
        }
      };

      const razorpayOrder = await this.razorpay.orders.create(options);

      // Store Razorpay order ID in database
      await prisma.order.update({
        where: { id: order.id },
        data: { 
          razorpayOrderId: razorpayOrder.id,
          paymentStatus: "PENDING"
        }
      });

      logger.info(`✅ Razorpay order created: ${razorpayOrder.id} for order ${order.id}`);

      return {
        id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        key: process.env.RAZORPAY_KEY_ID
      };
    } catch (error) {
      logger.error(`❌ Razorpay order creation failed: ${error.message}`);
      throw error;
    }
  }

  // Verify payment signature
  async verifyRazorpayPayment(paymentData, userId) {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = paymentData;

    try {
      // Verify the order belongs to the user
      const order = await prisma.order.findFirst({
        where: { 
          id: parseInt(orderId),
          userId: userId,
          razorpayOrderId: razorpay_order_id
        },
        include: { user: true, items: { include: { product: true } } }
      });

      if (!order) {
        throw new Error("Order not found or access denied");
      }

      // Verify payment signature
      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(razorpay_order_id + "|" + razorpay_payment_id)
        .digest("hex");

      if (expectedSignature !== razorpay_signature) {
        // Update order status to failed
        await prisma.order.update({
          where: { id: order.id },
          data: { 
            paymentStatus: "FAILED",
            paymentError: "Signature verification failed"
          }
        });

        throw new Error("Payment verification failed");
      }

      // Update order status to succeeded
      const updatedOrder = await prisma.order.update({
        where: { id: order.id },
        data: { 
          paymentStatus: "SUCCEEDED",
          razorpayPaymentId: razorpay_payment_id,
          fulfillmentStatus: "PROCESSING"
        },
        include: {
          user: true,
          items: { include: { product: true } }
        }
      });

      // Send payment success email
      await sendMail(
        order.user.email,
        `Payment Successful - Order #${order.id}`,
        getPaymentSuccessEmail(updatedOrder)
      );

      logger.info(`✅ Payment verified successfully for order ${order.id}`);

      return {
        success: true,
        order: updatedOrder,
        paymentId: razorpay_payment_id
      };
    } catch (error) {
      logger.error(`❌ Payment verification failed: ${error.message}`);
      
      // Update order status to failed
      await prisma.order.update({
        where: { id: parseInt(orderId) },
        data: { 
          paymentStatus: "FAILED",
          paymentError: error.message
        }
      });

      throw error;
    }
  }

  // Handle webhook events from Razorpay
  async handleWebhookEvent(event) {
    try {
      const { payload } = event;
      
      switch (event.event) {
        case 'payment.captured':
          await this.handlePaymentCaptured(payload.payment.entity);
          break;
        
        case 'payment.failed':
          await this.handlePaymentFailed(payload.payment.entity);
          break;
        
        case 'order.paid':
          await this.handleOrderPaid(payload.order.entity);
          break;
          
        default:
          logger.info(`ℹ️ Unhandled webhook event: ${event.event}`);
      }
    } catch (error) {
      logger.error(`❌ Webhook handling error: ${error.message}`);
      throw error;
    }
  }

  async handlePaymentCaptured(payment) {
    try {
      const order = await prisma.order.findFirst({
        where: { razorpayOrderId: payment.order_id },
        include: { user: true }
      });

      if (order && order.paymentStatus !== "SUCCEEDED") {
        await prisma.order.update({
          where: { id: order.id },
          data: { 
            paymentStatus: "SUCCEEDED",
            razorpayPaymentId: payment.id,
            fulfillmentStatus: "PROCESSING"
          }
        });

        logger.info(`✅ Payment captured via webhook for order ${order.id}`);
      }
    } catch (error) {
      logger.error(`❌ Payment captured webhook error: ${error.message}`);
    }
  }

  async handlePaymentFailed(payment) {
    try {
      const order = await prisma.order.findFirst({
        where: { razorpayOrderId: payment.order_id }
      });

      if (order) {
        await prisma.order.update({
          where: { id: order.id },
          data: { 
            paymentStatus: "FAILED",
            paymentError: payment.error_description || "Payment failed"
          }
        });

        // Send payment failed email
        if (order.user) {
          await sendMail(
            order.user.email,
            `Payment Failed - Order #${order.id}`,
            getPaymentFailedEmail(order)
          );
        }

        logger.info(`❌ Payment failed via webhook for order ${order.id}`);
      }
    } catch (error) {
      logger.error(`❌ Payment failed webhook error: ${error.message}`);
    }
  }

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
        totalAmount: true
      }
    });

    if (!order) {
      throw new Error("Order not found");
    }

    return order;
  }
}