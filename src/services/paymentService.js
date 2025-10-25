import prisma from "../config/prisma.js";
import Razorpay from "razorpay";
import crypto from "crypto";
import logger from "../utils/logger.js";
import { OrderService } from "./orderService.js";
import { ProductVariantService } from "./productVariantService.js";
import { getPaymentSuccessEmail } from "../utils/emailTemplates.js";
import { CalculationService } from "./calculationService.js";

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

    // 🎯 USE CALCULATION SERVICE FOR DYNAMIC TOTALS
    const calculationService = new CalculationService();
    
    // Prepare cart items for calculation
    const cartItems = items.map(item => ({
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
      price: item.price, // Make sure price is included
      size: item.size,
      color: item.color,
      name: item.name || `Product ${item.productId}`
    }));

    // Get complete order totals with real-time shipping, tax, and coupon
    const calculationResult = await calculationService.calculateOrderTotals(
      cartItems,
      shippingAddress,
      couponCode,
      userId
    );

    if (!calculationResult.success) {
      throw new Error(`Calculation failed: ${calculationResult.message}`);
    }

    const totals = calculationResult.data;
    
    logger.info('💰 Dynamic Calculation Results:', {
      subtotal: totals.subtotal,
      shipping: totals.shipping,
      tax: totals.tax,
      discount: totals.discount,
      finalTotal: totals.finalTotal,
      currency: totals.breakdown.currency
    });

    // 🎯 Prepare validated items for order creation
    const validatedItems = [];
    
    // Validate variants
    const validationPromises = items.map(item => 
      this.variantService.validateVariant(item.productId, item.variantId)
    );
    
    const variantResults = await Promise.all(validationPromises);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const variantInfo = variantResults[i];

      if (!variantInfo) {
        throw new Error(`Invalid variant for product ${item.productId}`);
      }

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

    // 🎯 Set up currency and exchange
    const userCountry = shippingAddress?.country || 'US';
    const displayCurrency = userCountry === 'IN' ? 'INR' : 'USD';
    const exchangeRate = 87.8; // You might want to get this dynamically

    // Convert USD to INR for Razorpay
    const finalAmountINR = Math.round(totals.finalTotal * exchangeRate);

    // 🎯 Create temporary order data with ALL calculated amounts
    const tempOrderData = {
      userId,
      items: validatedItems,
      shippingAddress,
      orderImage: orderImage || null,
      orderNotes: orderNotes || null,
      couponCode: totals.breakdown.couponCode,
      subtotalAmount: totals.subtotal,
      shippingCost: totals.shipping,
      taxAmount: totals.tax,
      taxRate: totals.breakdown.taxRate,
      discountAmount: totals.discount,
      finalAmountUSD: totals.finalTotal,
      finalAmountINR: finalAmountINR,
      displayCurrency: displayCurrency,
      exchangeRate: exchangeRate,
      userCountry: userCountry,
      // Include calculation details for reference
      calculationDetails: {
        isFreeShipping: totals.shippingDetails.isFree,
        freeShippingThreshold: totals.shippingDetails.freeShippingThreshold,
        taxCountry: totals.taxDetails.country,
        couponValid: totals.couponDetails.isValid
      }
    };

    logger.info('Creating Razorpay order with dynamic calculation:', {
      userId,
      itemCount: validatedItems.length,
      finalAmountUSD: totals.finalTotal,
      finalAmountINR: finalAmountINR,
      includesShipping: totals.shipping,
      includesTax: totals.tax,
      includesDiscount: totals.discount
    });

    // Create Razorpay order
    const razorpayOrder = await this.razorpay.orders.create({
      amount: Math.round(finalAmountINR * 100), // Convert to paise
      currency: "INR",
      receipt: `order_${Date.now()}`,
      notes: {
        tempOrderData: JSON.stringify(tempOrderData),
        userId: userId.toString(),
        timestamp: new Date().toISOString(),
        calculationMethod: 'dynamic_with_shipping_tax'
      }
    });

    logger.info(`✅ Razorpay order created: ${razorpayOrder.id} - Amount: ${finalAmountINR} INR`);

    return {
      id: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      key: process.env.RAZORPAY_KEY_ID,
      displayAmount: totals.finalTotal, // USD amount for display
      displayCurrency: displayCurrency,
      userCountry: userCountry,
      calculationSummary: {
        subtotal: totals.subtotal,
        shipping: totals.shipping,
        tax: totals.tax,
        discount: totals.discount,
        finalTotal: totals.finalTotal
      }
    };

  } catch (error) {
    logger.error(`❌ Razorpay order creation failed: ${error.message}`);
    throw error;
  }
}

async verifyRazorpayPayment(paymentData, userId) {
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = paymentData;

  try {
    logger.info(`🔄 Verifying payment: ${razorpay_payment_id} for user: ${userId}`);

    // 🎯 STEP 1: Quick signature verification (FAST)
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      throw new Error("Payment signature verification failed");
    }

    // 🎯 STEP 2: Get Razorpay order with timeout
    const razorpayOrder = await Promise.race([
      this.razorpay.orders.fetch(razorpay_order_id),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Razorpay API timeout")), 10000) // 10s timeout
      )
    ]);
    
    if (!razorpayOrder.notes || !razorpayOrder.notes.tempOrderData) {
      throw new Error("Invalid order data in payment");
    }

    const tempOrderData = JSON.parse(razorpayOrder.notes.tempOrderData);

    // 🎯 STEP 3: Quick user validation
    const tempUserId = parseInt(tempOrderData.userId);
    const currentUserId = parseInt(userId);

    if (tempUserId !== currentUserId) {
      logger.error(`❌ User mismatch - Temp: ${tempUserId}, Current: ${currentUserId}`);
      throw new Error("Payment user mismatch");
    }

    logger.info(`✅ Payment verified, creating order for user: ${userId}`);

    // 🎯 STEP 4: Create order but don't wait for Printify (make it async)
    // Return success immediately and process order in background
    this.orderService.createOrderFromPayment(
      userId, 
      tempOrderData, 
      razorpay_payment_id, 
      razorpay_order_id
    ).catch(error => {
      logger.error(`❌ Background order creation failed: ${error.message}`);
    });

    logger.info(`✅ Payment verified successfully, order processing in background`);

    return {
      success: true,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      message: "Payment verified successfully! Your order is being processed."
    };

  } catch (error) {
    logger.error(`❌ Payment verification failed: ${error.message}`);
    
    // 🎯 Better error handling for timeout
    if (error.message.includes('timeout') || error.code === 'ECONNABORTED') {
      throw new Error("Payment verification is taking longer than expected. Your order is being processed in the background. Please check your orders page in a few minutes.");
    }
    
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