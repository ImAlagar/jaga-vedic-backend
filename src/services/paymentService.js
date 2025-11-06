import prisma from "../config/prisma.js";
import Razorpay from "razorpay";
import crypto from "crypto";
import logger from "../utils/logger.js";
import { OrderService } from "./orderService.js";
import { ProductVariantService } from "./productVariantService.js";
import { getPaymentSuccessEmail } from "../utils/emailTemplates.js";
import { CalculationService } from "./calculationService.js";
import { CurrencyService } from "./currencyService.js";

export class PaymentService {
  constructor() {
    this.razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
    this.orderService = new OrderService();
    this.variantService = new ProductVariantService();
    this.currencyService = new CurrencyService();
  }

  // 🔥 UPDATED: Create Razorpay order with DYNAMIC exchange rates
  async createRazorpayOrder(orderData, userId) {
    try {
      const { items, shippingAddress, orderImage, orderNotes, couponCode } = orderData;

      // ✅ FIXED: Validate required fields properly
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
        price: item.price,
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

      // 🎯 DYNAMIC CURRENCY CONVERSION
      const userCountry = shippingAddress?.country || 'US';
      const displayCurrency = this.currencyService.getUserCurrencyFromCountry(userCountry);
      
      // Get dynamic exchange rate from USD to INR for Razorpay
      const exchangeRate = await this.getExchangeRate('USD', 'INR');
      
      logger.info('Dynamic exchange rate fetched:', {
        from: 'USD',
        to: 'INR',
        rate: exchangeRate,
        userCountry: userCountry,
        displayCurrency: displayCurrency
      });

      // Convert USD to INR for Razorpay
      const finalAmountINR = totals.finalTotal * exchangeRate;
      
      // Validate the final amount
      if (finalAmountINR <= 0) {
        throw new Error(`Invalid calculated amount: ${finalAmountINR} INR`);
      }

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

      // 🎯 Convert all amounts to display currency for user visibility
      const displayAmounts = await this.currencyService.convertOrderCalculations(
        {
          subtotal: totals.subtotal,
          shipping: totals.shipping,
          tax: totals.tax,
          discount: totals.discount,
          finalTotal: totals.finalTotal
        },
        displayCurrency
      );

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
        displayAmount: displayAmounts.finalTotal,
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

      logger.info('Creating Razorpay order with dynamic calculation and exchange rates:', {
        userId,
        itemCount: validatedItems.length,
        finalAmountUSD: totals.finalTotal,
        finalAmountINR: finalAmountINR,
        displayAmount: displayAmounts.finalTotal,
        displayCurrency: displayCurrency,
        exchangeRate: exchangeRate,
        includesShipping: totals.shipping,
        includesTax: totals.tax,
        includesDiscount: totals.discount
      });

      // Add validation before creating Razorpay order
      const razorpayAmountInPaise = Math.round(finalAmountINR * 100);
      if (razorpayAmountInPaise < 100) { // Minimum 1 INR in paise
        throw new Error(`Amount too low for Razorpay: ${finalAmountINR} INR (${razorpayAmountInPaise} paise)`);
      }

      const razorpayOrder = await this.razorpay.orders.create({
        amount: razorpayAmountInPaise,
        currency: "INR",
        receipt: `order_${Date.now()}`,
        notes: {
          tempOrderData: JSON.stringify(tempOrderData),
          userId: userId.toString(),
          timestamp: new Date().toISOString(),
          calculationMethod: 'dynamic_with_shipping_tax',
          exchangeRate: exchangeRate.toString(),
          debugAmounts: JSON.stringify({
            finalTotalUSD: totals.finalTotal,
            exchangeRate: exchangeRate,
            finalAmountINR: finalAmountINR,
            razorpayAmountPaise: razorpayAmountInPaise,
            displayCurrency: displayCurrency,
            displayAmount: displayAmounts.finalTotal
          })
        }
      });

      return {
        id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        key: process.env.RAZORPAY_KEY_ID,
        displayAmount: displayAmounts.finalTotal,
        displayCurrency: displayCurrency,
        userCountry: userCountry,
        exchangeRate: exchangeRate,
        calculationSummary: {
          subtotal: displayAmounts.subtotal,
          shipping: displayAmounts.shipping,
          tax: displayAmounts.tax,
          discount: displayAmounts.discount,
          finalTotal: displayAmounts.finalTotal,
          originalCurrency: 'USD',
          convertedCurrency: displayCurrency
        },
        formattedAmounts: {
          subtotal: this.currencyService.formatPriceForDisplay(displayAmounts.subtotal, displayCurrency),
          shipping: this.currencyService.formatPriceForDisplay(displayAmounts.shipping, displayCurrency),
          tax: this.currencyService.formatPriceForDisplay(displayAmounts.tax, displayCurrency),
          discount: this.currencyService.formatPriceForDisplay(displayAmounts.discount, displayCurrency),
          finalTotal: this.currencyService.formatPriceForDisplay(displayAmounts.finalTotal, displayCurrency)
        }
      };

    } catch (error) {
      console.error('❌ RAZORPAY ORDER - Detailed creation failed:', {
        error: error.message,
        stack: error.stack,
        userId: userId,
        orderData: orderData ? {
          hasItems: !!orderData.items,
          itemsCount: orderData.items?.length,
          hasShippingAddress: !!orderData.shippingAddress
        } : 'No orderData'
      });
      throw error;
    }
  }

  // 🔥 NEW: Get real-time exchange rate
  async getExchangeRate(fromCurrency = 'USD', toCurrency = 'INR') {
    try {
      const rate = await this.currencyService.convertPrice(1, fromCurrency, toCurrency);
      logger.info(`Exchange rate fetched: 1 ${fromCurrency} = ${rate} ${toCurrency}`);
      return rate;
    } catch (error) {
      logger.warn('Failed to fetch dynamic exchange rate, using fallback:', error.message);
      // Fallback to default rates
      const defaultRates = this.currencyService.getDefaultRates();
      return defaultRates[toCurrency] || 88.72; // Default INR rate
    }
  }

  // 🔥 NEW: Get currency information for frontend
  async getCurrencyInfo(countryCode) {
    try {
      const currency = this.currencyService.getUserCurrencyFromCountry(countryCode);
      const symbol = this.currencyService.getCurrencySymbol(currency);
      const rates = await this.currencyService.getExchangeRates('USD');
      
      return {
        currency,
        symbol,
        exchangeRates: rates,
        supported: this.currencyService.validateCurrency(currency) === currency
      };
    } catch (error) {
      logger.error('Failed to get currency info:', error);
      return {
        currency: 'USD',
        symbol: '$',
        exchangeRates: this.currencyService.getDefaultRates(),
        supported: true
      };
    }
  }

// services/paymentService.js - PRODUCTION FIX
async verifyRazorpayPayment(paymentData, userId) {
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = paymentData;

  console.log('🔍 Starting payment verification...', {
    paymentId: razorpay_payment_id?.substring(0, 10) + '...',
    orderId: razorpay_order_id?.substring(0, 10) + '...',
    userId: userId
  });

  try {
    // 🔥 STEP 1: SIGNATURE VERIFICATION
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      console.error('❌ Signature verification failed');
      throw new Error("Payment signature verification failed");
    }

    console.log('✅ Signature verification passed');

    // 🔥 STEP 2: CHECK FOR DUPLICATE PAYMENT
    const existingOrder = await prisma.order.findFirst({
      where: {
        razorpayPaymentId: razorpay_payment_id,
        paymentStatus: "SUCCEEDED"
      },
      select: {
        id: true,
        paymentStatus: true,
        fulfillmentStatus: true
      }
    });

    if (existingOrder) {
      console.log('✅ Payment already processed successfully:', existingOrder.id);
      return {
        success: true,
        paymentId: razorpay_payment_id,
        orderId: existingOrder.id,
        razorpayOrderId: razorpay_order_id,
        message: "Payment already verified successfully"
      };
    }

    // 🔥 STEP 3: GET RAZORPAY ORDER DATA
    console.log('📋 Fetching Razorpay order data...');
    const razorpayOrder = await this.razorpay.orders.fetch(razorpay_order_id);

    if (!razorpayOrder.notes || !razorpayOrder.notes.tempOrderData) {
      console.error('❌ No temp order data in Razorpay order');
      throw new Error("Invalid order data in payment");
    }

    const tempOrderData = JSON.parse(razorpayOrder.notes.tempOrderData);
    console.log('✅ Razorpay order data fetched');

    // 🔥 STEP 4: USER VALIDATION
    const tempUserId = parseInt(tempOrderData.userId);
    const currentUserId = parseInt(userId);

    if (tempUserId !== currentUserId) {
      console.error('❌ User mismatch:', { tempUserId, currentUserId });
      throw new Error("Payment user mismatch");
    }

    console.log('✅ User validation passed');

    // 🔥 STEP 5: CREATE ORDER
    console.log('🔄 Creating order from payment data...');
    const createdOrder = await this.orderService.createOrderFromPayment(
      userId, 
      tempOrderData, 
      razorpay_payment_id, 
      razorpay_order_id
    );

    if (!createdOrder || !createdOrder.id) {
      console.error('❌ Order creation returned invalid data:', createdOrder);
      throw new Error("Database order creation failed - no valid order returned");
    }

    console.log('✅ Order created successfully:', createdOrder.id);

    return {
      success: true,
      paymentId: razorpay_payment_id,
      orderId: createdOrder.id,
      razorpayOrderId: razorpay_order_id,
      message: "Payment verified successfully! Your order has been created."
    };

  } catch (error) {
    console.error('❌ Payment verification failed:', {
      error: error.message,
      stack: error.stack,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      userId: userId
    });

    // 🔥 USER-FRIENDLY ERROR MESSAGES
    let userFriendlyMessage = 'Payment verification failed';

    if (error.message.includes('Unique constraint')) {
      if (error.message.includes('razorpay_payment_id')) {
        // Try to find the order that was created
        const existingOrder = await prisma.order.findFirst({
          where: {
            razorpayPaymentId: razorpay_payment_id
          },
          select: { id: true, paymentStatus: true }
        });

        if (existingOrder) {
          return {
            success: true,
            paymentId: razorpay_payment_id,
            orderId: existingOrder.id,
            razorpayOrderId: razorpay_order_id,
            message: "Payment was already processed successfully"
          };
        } else {
          userFriendlyMessage = 'Payment processing issue. Please check your orders page.';
        }
      } else {
        userFriendlyMessage = 'Order processing issue. Please try again in a moment.';
      }
    } else if (error.message.includes('signature')) {
      userFriendlyMessage = 'Payment security verification failed.';
    } else if (error.message.includes('timeout')) {
      userFriendlyMessage = 'Payment verification timeout. Please check your orders page.';
    } else if (error.message.includes('user mismatch')) {
      userFriendlyMessage = 'Payment authentication failed.';
    }

    throw new Error(userFriendlyMessage);
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
      // Make sure sendMail is imported or available
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