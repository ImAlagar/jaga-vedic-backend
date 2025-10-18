// src/services/orderService.js
import prisma from "../config/prisma.js";
import { PrintifyOrderService } from "./printifyOrderService.js";
import { sendMail } from "../utils/mailer.js";
import { getOrderConfirmationEmail, getAdminNewOrderEmail, getOrderShippedEmail, getOrderCancelledEmail, getAdminCancellationEmail } from "../utils/emailTemplates.js";
import logger from "../utils/logger.js";
import { ProductVariantService } from "./productVariantService.js";
import { FulfillmentStatus, PaymentStatus } from "@prisma/client";
import RazorpayService from "./razorpayService.js"; // ✅ Change this line
import printifyShippingService from "./printifyShippingService.js";
import { taxService } from "./taxService.js";
import { couponService } from "./couponService.js";

export class OrderService {
  constructor() {
    this.variantService = new ProductVariantService();
    this.printifyService = new PrintifyOrderService(process.env.PRINTIFY_SHOP_ID);
     this.razorpayService = RazorpayService; // ✅ Change this line - no 'new' since it's already instantiated
  }

  printifyStatusMap = {
    'on-hold': 'PROCESSING',
    'in-production': 'PROCESSING',
    'fulfilled': 'SHIPPED',
    'shipped': 'SHIPPED',
    'delivered': 'DELIVERED',
    'canceled': 'CANCELLED',
    'refunded': 'REFUNDED'
  };


  async createOrder(userId, orderData) {
    try {
      console.log('🔍 SERVICE - Creating order for user:', userId);

      const { items, shippingAddress, orderImage, orderNotes, couponCode } = orderData;

      // Validate required fields
      if (!items || !Array.isArray(items) || items.length === 0) {
        throw new Error('Order items are required');
      }

      if (!shippingAddress) {
        throw new Error('Shipping address is required');
      }

      // ✅ ADD ROUNDING FUNCTIONS
      const roundToWholeNumber = (amount) => Math.round(amount);
      const roundUSDToWhole = (amount) => Math.round(amount * 100) / 100;

      // Validate shipping address fields
      const requiredAddressFields = ['firstName', 'lastName', 'email', 'phone', 'address1', 'city', 'region', 'country', 'zipCode'];
      const missingFields = requiredAddressFields.filter(field => !shippingAddress[field]);
      
      if (missingFields.length > 0) {
        throw new Error(`Missing required shipping fields: ${missingFields.join(', ')}`);
      }

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw new Error(`User with ID ${userId} not found`);
      }

      const productIds = items.map(item => item.productId).filter(Boolean);
      if (productIds.length === 0) {
        throw new Error('No valid product IDs found in order items');
      }

      const products = await prisma.product.findMany({
        where: { id: { in: productIds } }
      });
      
      const productMap = new Map(products.map(p => [p.id, p]));

      let subtotalAmount = 0;
      const orderItems = [];
      
      // Validate variants
      const validationPromises = items.map(item => 
        this.variantService.validateVariant(item.productId, item.variantId)
      );
      
      const variantResults = await Promise.all(validationPromises);

      // Process items and calculate subtotal
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const variantInfo = variantResults[i];
        const product = productMap.get(item.productId);

        if (!product) {
          throw new Error(`Product ${item.productId} not found`);
        }

        if (!product.inStock) {
          throw new Error(`Product ${product.name} is out of stock`);
        }

        const itemTotal = variantInfo.price * item.quantity;
        subtotalAmount += itemTotal;

        orderItems.push({
          productId: item.productId,
          quantity: item.quantity,
          price: roundUSDToWhole(variantInfo.price), // ✅ ROUNDED
          printifyVariantId: item.variantId?.toString(),
          printifyBlueprintId: variantInfo.blueprintId,
          printifyPrintProviderId: variantInfo.printProviderId,
          size: item.size,
          color: item.color,
        });
      }

      subtotalAmount = roundUSDToWhole(subtotalAmount); // ✅ ROUNDED

      // ==================== SHIPPING CALCULATION ====================
      let shippingCost = 0;
      let shippingDetails = null;
      try {
        console.log('🚚 ORDER SERVICE - Calculating shipping...');

        const shippingData = await printifyShippingService.calculateCartShipping(
          items.map(item => ({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
            price: variantResults.find(v => v.variantId === item.variantId)?.price || item.price
          })),
          shippingAddress.country,
          shippingAddress.region
        );
        
        shippingCost = roundUSDToWhole(shippingData.totalShipping); // ✅ ROUNDED
        shippingDetails = shippingData;
        
        console.log(`🚚 ORDER SERVICE - Shipping cost calculated: $${shippingCost}`);

        // 🔥 CRITICAL FIX: If shipping is too high, force fallback
        if (shippingCost > 15 && shippingAddress.country === 'IN') {
          console.warn('⚠️ ORDER SERVICE - Shipping cost too high for India, forcing fallback');
          shippingCost = roundUSDToWhole(5.99); // ✅ ROUNDED
          shippingDetails = {
            totalShipping: 5.99,
            isFree: false,
            hasFallback: true,
            originalShipping: 5.99
          };
        }

      } catch (error) {
        console.error('❌ ORDER SERVICE - Shipping calculation failed:', error);
        shippingCost = roundUSDToWhole(5.99); // ✅ ROUNDED
        shippingDetails = {
          totalShipping: 5.99,
          isFree: false,
          hasFallback: true,
          originalShipping: 5.99
        };
      }

      // Calculate tax
      let taxAmount = 0;
      let taxRate = 0;
      let taxBreakdown = null;
      try {
        console.log('🧾 Manual tax calculation for India');

        const taxData = await taxService.calculateTax({
          items: items.map((item, index) => {
            const product = productMap.get(item.productId);
            return {
              productId: item.productId,
              name: product?.name || `Product ${item.productId}`,
              price: variantResults[index]?.price || item.price,
              quantity: item.quantity
            };
          }),
          shippingAddress: shippingAddress,
          subtotal: subtotalAmount,
          shippingCost: shippingCost
        });
        
        if (taxData.success && taxData.data) {
          taxAmount = roundUSDToWhole(taxData.data.taxAmount || 0); // ✅ ROUNDED
          taxRate = taxData.data.taxRate || 0;
          taxBreakdown = taxData.data.breakdown || null;
          
          console.log(`🧾 DYNAMIC TAX: $${taxAmount} at rate ${(taxRate * 100)}%`);
        } else {
          throw new Error('Tax service returned unsuccessful');
        }
      } catch (error) {
        console.error('Dynamic tax calculation failed:', error);
        // Fallback to database tax rates
        try {
          const countryTax = await this.getTaxRateFromDatabase(shippingAddress.country);
          taxRate = countryTax.taxRate / 100;
          const taxableAmount = subtotalAmount + (countryTax.appliesToShipping ? shippingCost : 0);
          taxAmount = roundUSDToWhole(taxableAmount * taxRate); // ✅ ROUNDED
          
          console.log(`🧾 DATABASE TAX: $${taxAmount} at rate ${(taxRate * 100)}%`);
        } catch (dbError) {
          console.error('Database tax fallback failed:', dbError);
          taxRate = await this.getStaticTaxRate(shippingAddress.country);
          taxAmount = roundUSDToWhole((subtotalAmount + shippingCost) * taxRate); // ✅ ROUNDED
          console.log(`🔄 STATIC FALLBACK: $${taxAmount} at rate ${(taxRate * 100)}%`);
        }
      }

      // Validate coupon
      let discountAmount = 0;
      let finalCouponCode = null;
      let finalCouponId = null;

      if (couponCode && couponCode.trim() !== '') {
        try {
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
            discountAmount = roundUSDToWhole(couponValidation.coupon.discountAmount); // ✅ ROUNDED
            finalCouponCode = couponValidation.coupon.code;
            finalCouponId = couponValidation.coupon.id;
          } else {
            throw new Error(`Coupon validation failed: ${couponValidation.error}`);
          }
        } catch (error) {
          console.error('Coupon processing failed:', error);
        }
      }

      // Calculate final amounts
      const userCountry = shippingAddress?.country || 'US';
      const displayCurrency = userCountry === 'IN' ? 'INR' : 'USD';
      const exchangeRate = 88;

      let finalAmountUSD = subtotalAmount + shippingCost + taxAmount - discountAmount;
      finalAmountUSD = Math.max(0.01, finalAmountUSD);

      // ✅ ROUND FINAL AMOUNTS TO WHOLE NUMBERS
      const finalAmountINR = roundToWholeNumber(finalAmountUSD * exchangeRate);
      finalAmountUSD = roundUSDToWhole(finalAmountUSD);

      console.log('💰 FINAL CALCULATIONS (ROUNDED):', {
        subtotal: subtotalAmount,
        shipping: shippingCost,
        tax: taxAmount,
        discount: discountAmount,
        finalUSD: finalAmountUSD,
        finalINR: finalAmountINR,
        currency: displayCurrency
      });

      // Create order with transaction
      let order;
      try {
        order = await prisma.$transaction(async (tx) => {
          // Create main order - STORE ROUNDED VALUES
          const newOrder = await tx.order.create({
            data: {
              userId,
              totalAmount: finalAmountINR, // ✅ Already rounded
              subtotalAmount: subtotalAmount,
              currency: displayCurrency,
              baseCurrency: 'USD',
              exchangeRate: exchangeRate,
              originalAmount: finalAmountUSD, // ✅ Already rounded
              paymentStatus: "PENDING",
              fulfillmentStatus: "PLACED",
              shippingAddress: shippingAddress,
              orderImage: orderImage || null,
              orderNotes: orderNotes || null,
              couponCode: finalCouponCode,
              discountAmount: discountAmount,
              items: {
                create: orderItems,
              },
            },
            include: {
              items: {
                include: {
                  product: true
                }
              }
            }
          });

          // Create shipping record - STORE ROUNDED VALUES
          await tx.orderShipping.create({
            data: {
              orderId: newOrder.id,
              shippingCost: shippingCost, // ✅ Already rounded
              status: "PENDING",
              shippingMethod: shippingDetails?.methodId || null,
              carrier: shippingDetails?.carrier || null,
              estimatedDelivery: shippingDetails?.estimatedDelivery ? 
                new Date(shippingDetails.estimatedDelivery) : null,
            },
          });

          return newOrder;
        });
      } catch (transactionError) {
        console.error('❌ Transaction failed:', transactionError);
        throw new Error(`Order creation transaction failed: ${transactionError.message}`);
      }

      // Fetch complete order with relations
      const completeOrder = await prisma.order.findUnique({
        where: { id: order.id },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true
            }
          },
          items: { 
            include: { 
              product: true 
            } 
          },
          shipping: true
        },
      });

      if (!completeOrder) {
        throw new Error(`Failed to fetch created order ${order.id}`);
      }

      // Record coupon usage
      if (finalCouponId && finalCouponCode) {
        try {
          await couponService.markCouponAsUsed({
            couponId: finalCouponId,
            userId: userId,
            orderId: order.id,
            discountAmount: discountAmount,
            couponCode: finalCouponCode
          });
        } catch (couponError) {
          console.error('Failed to record coupon usage:', couponError);
        }
      }

      console.log('✅ SERVICE - Order created successfully:', {
        orderId: completeOrder.id,
        totalAmount: completeOrder.totalAmount,
        currency: completeOrder.currency,
        roundedAmounts: {
          subtotal: subtotalAmount,
          shipping: shippingCost,
          tax: taxAmount,
          discount: discountAmount,
          finalUSD: finalAmountUSD,
          finalINR: finalAmountINR
        }
      });

      // Handle async operations
      this.handleAsyncOperations(completeOrder).catch(err => {
        console.error('Async operations failed:', err);
      });

      return completeOrder;

    } catch (error) {
      console.error('❌ SERVICE - Order creation error:', error);
      throw error;
    }
  }

  // 🔥 ADD THIS NEW METHOD TO YOUR OrderService CLASS
  async calculateExpectedTotals(items, shippingAddress, subtotal, shippingCost, taxAmount, discountAmount = 0) {
    const exchangeRate = 88;
    
    // Recalculate to ensure consistency
    const totalUSD = subtotal + shippingCost + taxAmount - discountAmount;
    const totalINR = totalUSD * exchangeRate;
    
    return {
      subtotalUSD: subtotal,
      shippingUSD: shippingCost,
      taxUSD: taxAmount,
      discountUSD: discountAmount,
      totalUSD: parseFloat(totalUSD.toFixed(2)),
      totalINR: parseFloat(totalINR.toFixed(2)),
      exchangeRate: exchangeRate
    };
  }

  // Add these methods to order service
async getTaxRateFromDatabase(countryCode) {
  try {
    // Correct country code if needed
    const correctedCountry = countryCode === 'TN' ? 'IN' : countryCode;
    
    const countryTax = await prisma.countryTaxRate.findFirst({
      where: { 
        countryCode: correctedCountry,
        isActive: true 
      }
    });

    if (!countryTax) {
      throw new Error(`No tax rate found for ${correctedCountry}`);
    }

    console.log('💰 DATABASE TAX RATE:', {
      country: correctedCountry,
      taxRate: countryTax.taxRate,
      appliesToShipping: countryTax.appliesToShipping
    });

    return countryTax;
  } catch (error) {
    console.error('Database tax rate fetch failed:', error);
    throw error;
  }
}

async getStaticTaxRate(countryCode) {
  // Static fallback rates
  const staticRates = {
    'IN': 0.18,    // India GST
    'US': 0.085,   // USA average
    'GB': 0.20,    // UK VAT
    'DE': 0.19,    // Germany VAT
    'FR': 0.20,    // France VAT
    'CA': 0.13,    // Canada HST
    'AU': 0.10,    // Australia GST
    'default': 0.10
  };
  
  const correctedCountry = countryCode === 'TN' ? 'IN' : countryCode;
  const rate = staticRates[correctedCountry] || staticRates.default;
  
  console.log('💰 STATIC TAX RATE:', {
    country: correctedCountry,
    rate: rate * 100 + '%'
  });
  
  return rate;
}

async handleAsyncOperations(order) {
  console.log(`🔄 Starting async operations for order ${order.id}`);
  
  try {
    const results = await Promise.allSettled([
      this.forwardToPrintify(order).catch(err => {
        console.error(`❌ Printify forwarding failed for order ${order.id}:`, err);
        return { status: 'rejected', reason: err };
      }),
      this.sendOrderNotifications(order).catch(err => {
        console.error(`❌ Email sending failed for order ${order.id}:`, err);
        return { status: 'rejected', reason: err };
      })
    ]);

    console.log(`✅ Async operations completed for order ${order.id}:`, results);
    
    // Log detailed results
    results.forEach((result, index) => {
      const operation = index === 0 ? 'Printify' : 'Email';
      if (result.status === 'fulfilled') {
        console.log(`✅ ${operation} operation successful for order ${order.id}`);
      } else {
        console.error(`❌ ${operation} operation failed for order ${order.id}:`, result.reason);
      }
    });
    
  } catch (error) {
    console.error(`💥 Async operations handler crashed for order ${order.id}:`, error);
  }
}

async forwardToPrintify(order) {
  console.log(`🔄 Starting Printify forwarding for order ${order.id}`);
  
  try {
    // Validate order data
    if (!order.items || order.items.length === 0) {
      throw new Error('No items in order');
    }

    const printifyItems = order.items.map((item) => ({
      ...item,
      printifyProductId: item.product.printifyProductId,
      sku: item.product.sku,
    }));

    console.log(`📦 Sending ${printifyItems.length} items to Printify for order ${order.id}`);

    const printifyOrder = await this.printifyService.createOrder({
      orderId: order.id,
      items: printifyItems,
      shippingAddress: order.shippingAddress,
      orderImage: order.orderImage,
    });

    console.log(`✅ Printify order created: ${printifyOrder.id}`);

    // Update order with Printify ID
    await prisma.order.update({
      where: { id: order.id },
      data: {
        printifyOrderId: printifyOrder.id,
        fulfillmentStatus: "PROCESSING",
      },
    });

    console.log(`✅ Order ${order.id} updated with Printify ID: ${printifyOrder.id}`);
    logger.info(`✅ Order ${order.id} forwarded to Printify: ${printifyOrder.id}`);
    
    return printifyOrder;
  } catch (err) {
    console.error(`❌ Printify forwarding failed for order ${order.id}:`, err);
    
    // Update order status to indicate Printify failure
    await prisma.order.update({
      where: { id: order.id },
      data: {
        fulfillmentStatus: "PRINTIFY_FAILED",
      },
    }).catch(updateErr => {
      console.error(`❌ Failed to update order status after Printify failure:`, updateErr);
    });
    
    throw err; // Re-throw to be caught by Promise.allSettled
  }
}

// 🔥 IMPROVED EMAIL NOTIFICATION WITH BETTER VALIDATION
async sendOrderNotifications(order) {
  console.log(`📧 Starting email notifications for order ${order.id}`);
  
  try {
    // Enhanced validation
    if (!order.user?.email) {
      const errorMsg = `❌ Customer email not found for order ${order.id}`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    }

    console.log(`✅ Customer email: ${order.user.email}`);

    // Generate email content with timeout
    let customerEmailHtml, adminEmailHtml;
    
    try {
      customerEmailHtml = await Promise.race([
        getOrderConfirmationEmail(order),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Email template timeout')), 10000)
        )
      ]);
      console.log('✅ Customer email template generated');
    } catch (templateError) {
      console.error('❌ Customer email template error:', templateError);
      customerEmailHtml = this.getFallbackOrderEmail(order);
    }

    // Similar for admin email...

    // Send emails with better error handling
    const emailPromises = [];
    
    // Customer email
    emailPromises.push(
      sendMail(
        order.user.email,
        `Order Confirmation - #${order.id}`,
        customerEmailHtml
      ).then(() => {
        console.log(`✅ Customer email sent to: ${order.user.email}`);
      }).catch(error => {
        console.error(`❌ Customer email failed:`, error);
        throw new Error(`Customer email failed: ${error.message}`);
      })
    );

    // Admin email
    if (process.env.ADMIN_EMAIL) {
      emailPromises.push(
        sendMail(
          process.env.ADMIN_EMAIL,
          `New Order - #${order.id}`,
          adminEmailHtml
        ).then(() => {
          console.log('✅ Admin email sent successfully');
        }).catch(error => {
          console.error('❌ Admin email failed:', error);
          // Don't throw for admin email failures
        })
      );
    }

    const results = await Promise.allSettled(emailPromises);
    console.log(`📧 Email results for order ${order.id}:`, results);
    
    return results;
    
  } catch (error) {
    console.error(`❌ Email notification failed for order ${order.id}:`, error);
    throw error; // Re-throw to be caught by Promise.allSettled
  }
}

  async debugOrderSync(orderId) {
    try {
      const order = await this.getOrderById(orderId);
      
      if (!order) {
        return { success: false, error: `Order ${orderId} not found in database` };
      }

      const debugInfo = {
        orderId: order.id,
        database: {
          printifyOrderId: order.printifyOrderId,
          fulfillmentStatus: order.fulfillmentStatus,
          paymentStatus: order.paymentStatus,
          trackingNumber: order.trackingNumber,
          createdAt: order.createdAt
        }
      };

      const connectionTest = await this.printifyService.testConnection();
      debugInfo.printifyConnection = connectionTest;

      if (order.printifyOrderId) {
        try {
          const printifyOrder = await this.printifyService.getOrder(order.printifyOrderId);
          debugInfo.printifyOrder = {
            exists: true,
            status: printifyOrder.status,
            external_id: printifyOrder.external_id,
            shipments: printifyOrder.shipments,
            created_at: printifyOrder.created_at
          };
        } catch (error) {
          debugInfo.printifyOrder = {
            exists: false,
            error: error.message
          };
        }
      } else {
        debugInfo.printifyOrder = { exists: false, error: 'No Printify order ID in database' };
      }

      const recentOrders = await this.printifyService.listAllOrders(10);
      debugInfo.recentPrintifyOrders = recentOrders;

      return { success: true, data: debugInfo };
    } catch (error) {
      logger.error(`❌ Debug order sync failed for order ${orderId}:`, error);
      return { success: false, error: error.message };
    }
  }

  async syncOrderStatusFromPrintify(orderId) {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { 
          user: true,
          items: { include: { product: true } } 
        }
      });

      if (!order) {
        throw new Error(`Order ${orderId} not found in database`);
      }

      if (!order.printifyOrderId) {
        logger.warn(`Order ${orderId} has no Printify order ID. It may not have been forwarded yet.`);
        
        const hoursSinceCreation = (new Date() - new Date(order.createdAt)) / (1000 * 60 * 60);
        if (hoursSinceCreation > 24) {
          await prisma.order.update({
            where: { id: orderId },
            data: { 
              fulfillmentStatus: 'FAILED',
              orderNotes: `Failed to sync with Printify: No Printify order ID after ${Math.round(hoursSinceCreation)} hours`
            }
          });
          throw new Error(`Order ${orderId} never reached Printify after ${Math.round(hoursSinceCreation)} hours`);
        }
        
        throw new Error(`Order ${orderId} not yet forwarded to Printify`);
      }

      logger.info(`🔄 Syncing order ${orderId} from Printify: ${order.printifyOrderId}`);

      const printifyOrder = await this.printifyService.getOrder(order.printifyOrderId);
      
      if (!printifyOrder) {
        throw new Error(`No data received from Printify for order ${order.printifyOrderId}`);
      }

      const newFulfillmentStatus = this.printifyStatusMap[printifyOrder.status] || 'PROCESSING';
      
      const latestShipment = printifyOrder.shipments?.[0];
      const trackingNumber = latestShipment?.number;
      const trackingUrl = latestShipment?.tracking_url;
      const carrier = latestShipment?.carrier;

      const updateData = {
        fulfillmentStatus: newFulfillmentStatus,
        printifyStatus: printifyOrder.status,
        ...(trackingNumber && { trackingNumber }),
        ...(trackingUrl && { trackingUrl }),
        ...(carrier && { carrier }),
        ...(latestShipment?.created_at && { 
          shipmentDate: new Date(latestShipment.created_at) 
        })
      };

      const statusChanged = order.fulfillmentStatus !== newFulfillmentStatus;
      const trackingAdded = !order.trackingNumber && trackingNumber;

      if (Object.keys(updateData).length > 0 && (statusChanged || trackingAdded)) {
        const updatedOrder = await prisma.order.update({
          where: { id: orderId },
          data: updateData,
          include: {
            user: true,
            items: { include: { product: true } }
          }
        });

        if ((statusChanged && newFulfillmentStatus === 'SHIPPED') || trackingAdded) {
          await this.sendShippingNotification(updatedOrder, latestShipment);
        }

        logger.info(`✅ Order ${orderId} status updated from ${order.fulfillmentStatus} to ${newFulfillmentStatus}`);
        return updatedOrder;
      } else {
        logger.info(`ℹ️ Order ${orderId} status unchanged: ${order.fulfillmentStatus}`);
      }

      return order;
    } catch (error) {
      if (error.message.includes('not found') || error.message.includes('404')) {
        logger.warn(`⚠️ Printify order not found for order ${orderId}. Marking for review.`);
        
        await prisma.order.update({
          where: { id: orderId },
          data: { 
            orderNotes: `Sync issue: ${error.message}. Last attempted: ${new Date().toISOString()}`
          }
        });
      }
      
      logger.error(`❌ Failed to sync order ${orderId}:`, error.message);
      throw error;
    }
  }

  async safeSyncOrderStatus(orderId) {
    try {
      return await this.syncOrderStatusFromPrintify(orderId);
    } catch (error) {
      if (error.message.includes('not found') || error.message.includes('404')) {
        logger.warn(`⚠️ Printify order missing for ${orderId}, using cached data: ${error.message}`);
        return await this.getOrderById(orderId);
      }
      throw error;
    }
  }

  async syncAllOrdersStatus() {
    try {
      const pendingOrders = await prisma.order.findMany({
        where: {
          fulfillmentStatus: { in: ['PLACED', 'PROCESSING', 'SHIPPED'] },
          printifyOrderId: { not: null }
        },
        include: { 
          user: true,
          items: { include: { product: true } } 
        }
      });

      logger.info(`🔄 Starting bulk sync for ${pendingOrders.length} orders`);

      const results = await Promise.allSettled(
        pendingOrders.map(order => this.safeSyncOrderStatus(order.id))
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      results.forEach((result, index) => {
        const order = pendingOrders[index];
        if (result.status === 'rejected') {
          logger.error(`❌ Sync failed for order ${order.id}:`, result.reason.message);
        }
      });

      logger.info(`✅ Bulk sync completed: ${successful} successful, ${failed} failed out of ${pendingOrders.length} total`);
      return { successful, failed, total: pendingOrders.length };
    } catch (error) {
      logger.error('❌ Bulk sync failed:', error);
      throw error;
    }
  }

  async getOrderWithTracking(orderId, userId, userRole) {
    const order = await this.getOrderById(orderId);
    
    const isAdmin = userRole === 'admin';
    const isOrderOwner = order.userId === userId;
    
    if (!isAdmin && !isOrderOwner) {
      throw new Error('Access denied');
    }

    if (!['DELIVERED', 'CANCELLED', 'REFUNDED', 'FAILED'].includes(order.fulfillmentStatus)) {
      try {
        const syncedOrder = await this.safeSyncOrderStatus(orderId);
        return syncedOrder;
      } catch (error) {
        logger.warn(`⚠️ Sync failed for order ${orderId}, using cached data: ${error.message}`);
      }
    }

    return order;
  }

  async sendShippingNotification(order, shipment) {
    try {
      const trackingInfo = {
        number: shipment?.number || order.trackingNumber,
        url: shipment?.tracking_url || order.trackingUrl,
        carrier: shipment?.carrier || order.carrier
      };

      await sendMail(
        order.user.email,
        `Your Order #${order.id} Has Shipped! 🚚`,
        getOrderShippedEmail(order, trackingInfo)
      );

      logger.info(`📧 Shipping notification sent for order ${order.id}`);
    } catch (error) {
      logger.error(`❌ Failed to send shipping notification: ${error.message}`);
    }
  }

// services/orderService.js
async cancelOrder(orderId, reason = "Cancelled by customer", cancelledBy = 'user') {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { 
        user: true,
        items: { include: { product: true } } 
      }
    });

    if (!order) {
      throw new Error("Order not found");
    }

    // Enhanced cancellation validation
    const cancellableStatuses = ['PLACED', 'PENDING', 'PROCESSING'];
    if (!cancellableStatuses.includes(order.fulfillmentStatus)) {
      throw new Error(`Cannot cancel order with status: ${order.fulfillmentStatus}`);
    }

    // Determine refund eligibility
    const isEligibleForRefund = order.paymentStatus === 'SUCCEEDED';
    const refundAmount = isEligibleForRefund ? order.totalAmount : 0;

    // Cancel in Printify first
    let printifyCancellation = { success: false, message: '' };
    if (order.printifyOrderId) {
      try {
        await this.printifyService.cancelOrder(order.printifyOrderId);
        printifyCancellation = { 
          success: true, 
          message: 'Successfully cancelled in Printify' 
        };
        logger.info(`✅ Cancelled Printify order: ${order.printifyOrderId}`);
      } catch (printifyError) {
        printifyCancellation = { 
          success: false, 
          message: `Printify cancellation failed: ${printifyError.message}` 
        };
        logger.warn(`⚠️ Could not cancel Printify order: ${printifyError.message}`);
      }
    }

    // Update order in database with enhanced cancellation data
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        fulfillmentStatus: 'CANCELLED',
        paymentStatus: isEligibleForRefund ? 'REFUND_PENDING' : 'FAILED',
        orderNotes: `${reason} | Requested by: ${cancelledBy} | Printify: ${printifyCancellation.message}`,
        cancelledAt: new Date(),
        cancellationReason: reason,
        cancelledBy: cancelledBy,
        refundStatus: isEligibleForRefund ? 'PENDING' : 'NOT_REQUIRED',
        refundAmount: refundAmount,
        refundRequestedAt: isEligibleForRefund ? new Date() : null
      },
      include: {
        user: true,
        items: { include: { product: true } }
      }
    });

    // Send cancellation notifications to both customer and admin
    await this.sendCancellationNotifications(updatedOrder, reason, cancelledBy);

    // Initiate refund process if eligible
    if (isEligibleForRefund) {
      this.processRefund(updatedOrder, reason).catch(err => {
        logger.error(`❌ Refund processing failed for order ${orderId}:`, err);
      });
    }

    logger.info(`✅ Order ${orderId} cancelled successfully`);
    return updatedOrder;
  } catch (error) {
    logger.error(`❌ Failed to cancel order ${orderId}:`, error);
    throw error;
  }
}

async sendCancellationNotifications(order, reason, cancelledBy) {
  try {
    // Send email to customer
    const customerEmailContent = await getOrderCancelledEmail(order, reason, cancelledBy);
    await sendMail(
      order.user.email,
      `Order #${order.id} Cancellation Confirmation - Agumiya Collections`,
      customerEmailContent
    );

    // Send email to admin
    const adminEmailContent = getAdminCancellationEmail(order, reason, cancelledBy);
    await sendMail(
      process.env.ADMIN_EMAIL || 'admin@agumiyacollections.com',
      `🚨 Order Cancellation Alert - #${order.id}`,
      adminEmailContent
    );

    logger.info(`📧 Cancellation notifications sent to customer and admin for order ${order.id}`);
  } catch (error) {
    logger.error(`❌ Failed to send cancellation notifications:`, error);
    throw error;
  }
}


async processRefund(order, reason = "Order cancellation") {
  try {
    
    // Enhanced validation
    if (!order.razorpayPaymentId) {
      throw new Error(`No Razorpay payment ID found for order ${order.id}`);
    }

    if (!order.refundAmount || order.refundAmount <= 0) {
      throw new Error(`Invalid refund amount: ${order.refundAmount}`);
    }

    // Update refund status to processing
    await prisma.order.update({
      where: { id: order.id },
      data: { refundStatus: 'PROCESSING' }
    });

    // Process refund with Razorpay
    const refund = await this.razorpayService.refundPayment(
      order.razorpayPaymentId, 
      order.refundAmount
    );


    // Create refund record
    const refundRecord = await prisma.refund.create({
      data: {
        orderId: order.id,
        refundId: refund.id,
        amount: order.refundAmount,
        status: 'COMPLETED',
        reason: reason,
        processedAt: new Date(),
        notes: `Razorpay Refund ID: ${refund.id} | Status: ${refund.status}`
      }
    });

    // Update order with refund details
    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: {
        refundStatus: 'COMPLETED',
        refundProcessedAt: new Date(),
        paymentStatus: 'REFUNDED',
        razorpayRefundId: refund.id,
        orderNotes: `${order.orderNotes} | Refund processed: ${refund.id}`
      },
      include: {
        user: true,
        items: { include: { product: true } }
      }
    });

    logger.info(`✅ Refund processed for order ${order.id}: ${refund.id}`);
    
    // Send refund confirmation
    await this.sendRefundNotification(updatedOrder, refund.id);
    
    return refundRecord;
  } catch (error) {
    console.error('❌ Refund process failed:', error);
    
    // Enhanced error logging
    await prisma.paymentLog.create({
      data: {
        orderId: order.id,
        userId: order.userId,
        paymentId: `refund_failed_${Date.now()}`,
        amount: order.refundAmount,
        status: 'FAILED',
        errorMessage: error.message,
        gateway: 'RAZORPAY',
        rawResponse: { error: error.toString() }
      }
    });

    // Update order with refund failure
    await prisma.order.update({
      where: { id: order.id },
      data: { 
        refundStatus: 'FAILED',
        orderNotes: `${order.orderNotes} | Refund failed: ${error.message}`
      }
    });

    logger.error(`❌ Refund processing failed for order ${order.id}:`, error);
    throw error;
  }
}




async sendRefundNotification(order, refundId) {
    try {
      const emailContent = getRefundProcessedEmail(order, refundId);
      
      await sendMail(
        order.user.email,
        `Refund Processed for Order #${order.id}`,
        emailContent
      );

      logger.info(`📧 Refund notification sent for order ${order.id}`);
    } catch (error) {
      logger.error(`❌ Failed to send refund notification: ${error.message}`);
    }
}

async getCancelledOrders(filters = {}) {
    const where = {
      fulfillmentStatus: 'CANCELLED',
      ...filters
    };

    return await prisma.order.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        items: {
          include: {
            product: {
              select: { name: true, price: true }
            }
          }
        },
        refunds: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { cancelledAt: 'desc' }
    });
}

  async getCancellationStats() {
    const [totalCancelled, pendingRefunds, completedRefunds, cancelledThisMonth] = await Promise.all([
      prisma.order.count({ where: { fulfillmentStatus: 'CANCELLED' } }),
      prisma.order.count({ where: { refundStatus: 'PENDING' } }),
      prisma.order.count({ where: { refundStatus: 'COMPLETED' } }),
      prisma.order.count({
        where: {
          fulfillmentStatus: 'CANCELLED',
          cancelledAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      })
    ]);

    const refundAmount = await prisma.order.aggregate({
      where: { refundStatus: 'COMPLETED' },
      _sum: { refundAmount: true }
    });

    const cancellationReasons = await prisma.order.groupBy({
      by: ['cancellationReason'],
      where: { fulfillmentStatus: 'CANCELLED' },
      _count: { id: true }
    });

    return {
      totalCancelled,
      pendingRefunds,
      completedRefunds,
      cancelledThisMonth,
      totalRefunded: refundAmount._sum.refundAmount || 0,
      cancellationReasons: cancellationReasons.map(cr => ({
        reason: cr.cancellationReason || 'No reason provided',
        count: cr._count.id
      }))
    };
  }

  async retryRefund(orderId) {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { user: true }
      });

      if (!order) {
        throw new Error("Order not found");
      }

      if (order.refundStatus !== 'FAILED') {
        throw new Error(`Refund cannot be retried. Current status: ${order.refundStatus}`);
      }

      if (order.paymentStatus !== 'REFUND_PENDING') {
        throw new Error("Order is not eligible for refund");
      }

      const refund = await this.processRefund(order, "Retry after failed attempt");

      return refund;
    } catch (error) {
      logger.error(`❌ Failed to retry refund for order ${orderId}:`, error);
      throw error;
    }
  }

  // 🔹 NEW: Send cancellation notification
  async sendCancellationNotification(order, reason) {
    try {
      const emailContent = `
        <h2>Order Cancelled</h2>
        <p>Your order #${order.id} has been cancelled.</p>
        <p><strong>Reason:</strong> ${reason}</p>
        <p><strong>Cancelled on:</strong> ${new Date().toLocaleDateString()}</p>
        ${order.paymentStatus === 'REFUNDED' ? 
          '<p>Your payment will be refunded within 5-7 business days.</p>' : 
          ''}
      `;

      await sendMail(
        order.user.email,
        `Order #${order.id} Cancelled`,
        emailContent
      );

      logger.info(`📧 Cancellation notification sent for order ${order.id}`);
    } catch (error) {
      logger.error(`❌ Failed to send cancellation notification: ${error.message}`);
    }
  }

  async getUserOrders(userId) {
    try {
        const orders = await prisma.order.findMany({
            where: { userId },
            include: {
                items: {
                    include: {
                        product: {
                            select: { id: true, name: true, price: true, images: true },
                        },
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });
         
        return orders;
    } catch (error) {
        console.error('Error in getUserOrders:', error);
        throw error;
    }
  }

async getAllOrders(filters = {}) {
  const {
    page = 1,
    limit = 5,
    search = '',
    status = '',
    paymentStatus = '',
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = filters;

  const skip = (page - 1) * limit;
  
  // Build where clause for filtering
  const where = {};
  
  if (status && status !== 'all') {
    where.fulfillmentStatus = status;
  }
  
  if (paymentStatus && paymentStatus !== 'all') {
    where.paymentStatus = paymentStatus;
  }
  
  if (search) {
    const searchTerm = search.trim();
    const orderId = parseInt(searchTerm);
    
    where.OR = [
      // Search by order ID (numeric)
      ...(isNaN(orderId) ? [] : [
        { id: { equals: orderId } },
        { razorpayOrderId: { contains: searchTerm, mode: 'insensitive' } }
      ]),
      // Search by string order identifiers
      { razorpayOrderId: { contains: searchTerm, mode: 'insensitive' } },
      { printifyOrderId: { contains: searchTerm, mode: 'insensitive' } },
      { trackingNumber: { contains: searchTerm, mode: 'insensitive' } },
      // Search by user information
      { 
        user: {
          OR: [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { email: { contains: searchTerm, mode: 'insensitive' } },
            { phone: { contains: searchTerm, mode: 'insensitive' } }
          ]
        }
      },
      // Search in product names through order items
      {
        items: {
          some: {
            product: {
              name: { contains: searchTerm, mode: 'insensitive' }
            }
          }
        }
      }
    ].filter(Boolean); // Remove any empty arrays from spread
  }

  // Get orders with pagination
  const orders = await prisma.order.findMany({
    where,
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
      items: {
        include: {
          product: {
            select: { id: true, name: true, price: true, images: true },
          },
        },
      },
    },
    orderBy: { [sortBy]: sortOrder },
    skip,
    take: limit,
  });

  // Get total count for pagination
  const totalCount = await prisma.order.count({ where });
  const totalPages = Math.ceil(totalCount / limit);

  return {
    orders,
    pagination: {
      currentPage: page,
      totalPages,
      totalCount,
      hasNext: page < totalPages,
      hasPrev: page > 1,
      limit: parseInt(limit)
    }
  };
}

  async updateOrderStatus(orderId, statusData) {
    const { paymentStatus, fulfillmentStatus } = statusData;

    if (!paymentStatus && !fulfillmentStatus) {
      throw new Error("At least one of paymentStatus or fulfillmentStatus is required");
    }

    return await prisma.order.update({
      where: { id: orderId },
      data: {
        ...(paymentStatus && { paymentStatus }),
        ...(fulfillmentStatus && { fulfillmentStatus }),
      },
      include: {
        user: true,
        items: { include: { product: true } },
      },
    });
  }

  async retryPrintifyForwarding(orderId) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: true,
        items: { include: { product: true } },
      },
    });

    if (!order) throw new Error("Order not found");
    if (order.printifyOrderId) throw new Error("Already forwarded to Printify");

    const printifyItems = order.items.map((item) => ({
      ...item,
      printifyProductId: item.product.printifyProductId,
      sku: item.product.sku,
    }));

    const printifyOrder = await this.printifyService.createOrder({
      orderId: order.id,
      items: printifyItems,
      shippingAddress: order.shippingAddress,
      orderImage: order.orderImage,
    });

    await prisma.order.update({
      where: { id: orderId },
      data: { printifyOrderId: printifyOrder.id, fulfillmentStatus: "PROCESSING" },
    });

    logger.info(`✅ Retry successful: Order ${orderId} forwarded as ${printifyOrder.id}`);
    return printifyOrder.id;
  }

  async getOrderStats() {
    try {
      const totalOrders = await prisma.order.count();
      
      const pending = await prisma.order.count({
        where: {
          OR: [
            { fulfillmentStatus: FulfillmentStatus.PLACED },
            { fulfillmentStatus: FulfillmentStatus.PROCESSING },
            { fulfillmentStatus: FulfillmentStatus.SHIPPED }
          ]
        }
      });
      
      const completed = await prisma.order.count({
        where: {
          fulfillmentStatus: FulfillmentStatus.DELIVERED
        }
      });
      
      const revenueResult = await prisma.order.aggregate({
        where: {
          fulfillmentStatus: FulfillmentStatus.DELIVERED,
          paymentStatus: PaymentStatus.SUCCEEDED
        },
        _sum: {
          totalAmount: true
        }
      });
      
      const revenue = revenueResult._sum.totalAmount || 0;
      
      return {
        totalOrders,
        pending,
        completed,
        revenue
      };
    } catch (error) {
      console.error("Error fetching order stats:", error); 
      throw new Error('Failed to fetch order statistics');
    }
  }

  async getOrderById(orderId) {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          user: {
            select: { 
              id: true, 
              name: true, 
              email: true 
            },
          },
          items: {
            include: {
              product: {
                select: { 
                  id: true, 
                  name: true, 
                  price: true, 
                  images: true,
                  printifyProductId: true
                },
              },
            },
          },
        },
      });

      if (!order) {
        throw new Error("Order not found");
      }

      return order;
    } catch (error) {
      console.error('Error in getOrderById:', error);
      throw error;
    }
  }

  async getAvailableFilters() {
    try {
      const [statusCounts, paymentStatusCounts, dateRange] = await Promise.all([
        prisma.order.groupBy({
          by: ['fulfillmentStatus'],
          _count: {
            id: true
          }
        }),
        prisma.order.groupBy({
          by: ['paymentStatus'],
          _count: {
            id: true
          }
        }),
        prisma.order.aggregate({
          _min: { createdAt: true },
          _max: { createdAt: true }
        })
      ]);

      return {
        statuses: statusCounts.map(s => ({
          value: s.fulfillmentStatus,
          label: s.fulfillmentStatus.charAt(0) + s.fulfillmentStatus.slice(1).toLowerCase(),
          count: s._count.id
        })),
        paymentStatuses: paymentStatusCounts.map(p => ({
          value: p.paymentStatus,
          label: p.paymentStatus.charAt(0) + p.paymentStatus.slice(1).toLowerCase(),
          count: p._count.id
        })),
        dateRange: {
          min: dateRange._min.createdAt,
          max: dateRange._max.createdAt
        }
      };
    } catch (error) {
      console.error('Error in getAvailableFilters:', error);
      throw error;
    }
  }

  async getFilteredOrders(filters, options) {
    try {
      const { page, limit, sortBy, sortOrder } = options;
      const offset = (page - 1) * limit;

      const [orders, total] = await Promise.all([
        prisma.order.findMany({
          where: filters,
          skip: offset,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            items: {
              include: {
                product: {
                  select: {
                    name: true,
                    price: true,
                    images: true
                  }
                }
              }
            }
          }
        }),
        prisma.order.count({ where: filters })
      ]);

      return {
        data: orders,
        meta: {
          total,
          page,
          totalPages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      console.error('Error in getFilteredOrders:', error);
      throw error;
    }
  }
}