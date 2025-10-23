import prisma from "../config/prisma.js";
import Razorpay from "razorpay";
import crypto from "crypto";
import logger from "../utils/logger.js";
import { OrderService } from "./orderService.js";
import { ProductVariantService } from "./productVariantService.js";
import { couponService } from "./couponService.js";
import { getPaymentSuccessEmail } from "../utils/emailTemplates.js";

export class PaymentService {
  constructor() {
    this.razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
    this.orderService = new OrderService();
    this.variantService = new ProductVariantService();
  }

  // 🔥 UPDATED: Create Razorpay order WITHOUT saving to database
  async createRazorpayOrder(orderData, userId) {
    try {
      const { items, shippingAddress, orderImage, orderNotes, couponCode } = orderData;

      // Validate required fields
      if (!items || !Array.isArray(items) || items.length === 0) {
        throw new Error('Order items are required');
      }

      if (!shippingAddress) {
        throw new Error('Shipping address is required');
      }

      // Validate shipping address fields
      const requiredAddressFields = ['firstName', 'email', 'phone', 'address1', 'city', 'region', 'country', 'zipCode'];
      const missingFields = requiredAddressFields.filter(field => !shippingAddress[field]);
      
      if (missingFields.length > 0) {
        throw new Error(`Missing required shipping fields: ${missingFields.join(', ')}`);
      }

      // Ensure lastName exists
      if (!shippingAddress.lastName) {
        shippingAddress.lastName = '';
      }

      // Validate user exists
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw new Error(`User with ID ${userId} not found`);
      }

      let subtotalAmount = 0;
      const validatedItems = [];
      
      // Validate variants and calculate total
      const validationPromises = items.map(item => 
        this.variantService.validateVariant(item.productId, item.variantId)
      );
      
      const variantResults = await Promise.all(validationPromises);

      // Process items and calculate subtotal
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const variantInfo = variantResults[i];

        if (!variantInfo) {
          throw new Error(`Invalid variant for product ${item.productId}`);
        }

        const itemTotal = variantInfo.price * item.quantity;
        subtotalAmount += itemTotal;

        validatedItems.push({
          productId: item.productId,
          quantity: item.quantity,
          price: variantInfo.price,
          printifyVariantId: item.variantId?.toString(),
          printifyBlueprintId: variantInfo.blueprintId,
          printifyPrintProviderId: variantInfo.printProviderId,
          size: item.size,
          color: item.color,
        });
      }

      subtotalAmount = Math.round(subtotalAmount * 100) / 100;

      // ==================== COUPON VALIDATION ====================
      let discountAmount = 0;
      let finalCouponCode = null;

      if (couponCode && couponCode.trim() !== '') {
        try {
          const products = await prisma.product.findMany({
            where: { id: { in: items.map(item => item.productId) } }
          });

          const couponValidation = await couponService.validateCoupon(
            couponCode.trim(),
            userId,
            items.map((item, index) => ({
              productId: item.productId,
              variantId: item.variantId,
              quantity: item.quantity,
              price: variantResults[index]?.price || item.price,
              product: products.find(p => p.id === item.productId)
            })),
            subtotalAmount
          );

          if (couponValidation.isValid) {
            discountAmount = Math.round(couponValidation.coupon.discountAmount * 100) / 100;
            finalCouponCode = couponValidation.coupon.code;
          }
        } catch (error) {
          console.error('Coupon processing failed:', error);
        }
      }

      // ==================== FINAL AMOUNT CALCULATION ====================
      const userCountry = shippingAddress?.country || 'US';
      const displayCurrency = userCountry === 'IN' ? 'INR' : 'USD';
      const exchangeRate = 88;

      // FINAL TOTAL = SUBTOTAL - DISCOUNT ONLY
      let finalAmountUSD = subtotalAmount - discountAmount;
      finalAmountUSD = Math.max(0.01, finalAmountUSD);
      finalAmountUSD = Math.round(finalAmountUSD * 100) / 100;

      // Round final amounts
      const finalAmountINR = Math.round(finalAmountUSD * exchangeRate);

      // 🎯 Create temporary order data (not saved to DB yet)
      const tempOrderData = {
        userId,
        items: validatedItems,
        shippingAddress,
        orderImage: orderImage || null,
        orderNotes: orderNotes || null,
        couponCode: finalCouponCode,
        subtotalAmount,
        discountAmount,
        finalAmountUSD,
        finalAmountINR,
        displayCurrency,
        exchangeRate,
        userCountry
      };

      logger.info('Creating Razorpay order with temp data:', {
        userId,
        itemCount: validatedItems.length,
        finalAmountINR,
        finalAmountUSD
      });

      // Create Razorpay order
      const razorpayOrder = await this.razorpay.orders.create({
        amount: Math.round(finalAmountINR * 100), // Convert to paise
        currency: "INR",
        receipt: `order_${Date.now()}`,
        notes: {
          tempOrderData: JSON.stringify(tempOrderData),
          userId: userId.toString(),
          timestamp: new Date().toISOString()
        }
      });

      logger.info(`✅ Razorpay order created: ${razorpayOrder.id}`);

      return {
        id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        key: process.env.RAZORPAY_KEY_ID,
        displayAmount: finalAmountUSD,
        displayCurrency: displayCurrency,
        userCountry: userCountry
      };

    } catch (error) {
      logger.error(`❌ Razorpay order creation failed: ${error.message}`);
      throw error;
    }
  }

async verifyRazorpayPayment(paymentData, userId) {
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = paymentData;

  try {
    logger.info(`🔄 Verifying payment: ${razorpay_payment_id} for order: ${razorpay_order_id} for user: ${userId}`);

    // Verify signature FIRST
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      throw new Error("Payment signature verification failed");
    }

    // Get Razorpay order to retrieve temp order data
    const razorpayOrder = await this.razorpay.orders.fetch(razorpay_order_id);
    
    if (!razorpayOrder.notes || !razorpayOrder.notes.tempOrderData) {
      throw new Error("Invalid order data in payment");
    }

    const tempOrderData = JSON.parse(razorpayOrder.notes.tempOrderData);

    // 🔥 FIX: Better user validation
    const tempUserId = parseInt(tempOrderData.userId);
    const currentUserId = parseInt(userId);

    logger.info(`🔍 User validation - Temp: ${tempUserId}, Current: ${currentUserId}`);

    if (tempUserId !== currentUserId) {
      logger.error(`❌ User mismatch - Temp: ${tempUserId}, Current: ${currentUserId}`);
      throw new Error("Payment user mismatch - please contact support");
    }

    logger.info(`✅ Payment verified, creating order for user: ${userId}`);

    // 🎯 NOW CREATE THE ACTUAL ORDER IN DATABASE
    const order = await this.orderService.createOrderFromPayment(
      userId, 
      tempOrderData, 
      razorpay_payment_id, 
      razorpay_order_id
    );

    logger.info(`✅ Order created successfully: ${order.id}`);

    return {
      success: true,
      order: order,
      paymentId: razorpay_payment_id,
      message: "Payment verified and order created successfully"
    };

  } catch (error) {
    logger.error(`❌ Payment verification failed: ${error.message}`);
    throw error;
  }
}

  // Handle webhook events
  async handleWebhookEvent(webhookData) {
    try {
      if (webhookData.event === 'payment.captured') {
        const payment = webhookData.payload.payment.entity;
        
        // Get Razorpay order to retrieve temp order data
        const razorpayOrder = await this.razorpay.orders.fetch(payment.order_id);
        
        if (razorpayOrder.notes && razorpayOrder.notes.tempOrderData) {
          const tempOrderData = JSON.parse(razorpayOrder.notes.tempOrderData);
          
          // Create order from webhook
          await this.orderService.createOrderFromPayment(
            parseInt(tempOrderData.userId),
            tempOrderData,
            payment.id,
            payment.order_id
          );
          
          logger.info(`✅ Order created from webhook: ${payment.order_id}`);
        }
      }
    } catch (error) {
      logger.error(`❌ Webhook processing failed: ${error.message}`);
    }
  }

  async sendPaymentSuccessEmail(order) {
  try {
    // Get complete order details for email
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
    logger.error(`❌ Payment success email failed for order ${order?.id}:`, error);
    // Don't throw error to prevent breaking payment flow
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
        totalAmount: true,
        createdAt: true
      }
    });

    if (!order) {
      throw new Error("Order not found");
    }

    return order;
  }

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