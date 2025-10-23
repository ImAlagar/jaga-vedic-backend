// src/services/orderService.js
import prisma from "../config/prisma.js";
import { PrintifyOrderService } from "./printifyOrderService.js";
import { sendMail } from "../utils/mailer.js";
import { getOrderConfirmationEmail, getAdminNewOrderEmail, getOrderShippedEmail, getOrderCancelledEmail, getAdminCancellationEmail,getRefundProcessedEmail } from "../utils/emailTemplates.js";
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
      const { items, shippingAddress, orderImage, orderNotes, couponCode } = orderData;

      // Validate required fields
      if (!items || !Array.isArray(items) || items.length === 0) {
        throw new Error('Order items are required');
      }

      if (!shippingAddress) {
        throw new Error('Shipping address is required');
      }

      // Rounding functions
      const roundToWholeNumber = (amount) => Math.round(amount);
      const roundUSDToWhole = (amount) => Math.round(amount * 100) / 100;

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

      // Get product IDs from items
      const productIds = items.map(item => item.productId).filter(Boolean);
      if (productIds.length === 0) {
        throw new Error('No valid product IDs found in order items');
      }

      // Fetch products
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
          price: roundUSDToWhole(variantInfo.price),
          printifyVariantId: item.variantId?.toString(),
          printifyBlueprintId: variantInfo.blueprintId,
          printifyPrintProviderId: variantInfo.printProviderId,
          size: item.size,
          color: item.color,
        });
      }

      subtotalAmount = roundUSDToWhole(subtotalAmount);

      // 🚫 REMOVED SHIPPING CALCULATION - ALWAYS 0
      let shippingCost = 0;
      let shippingDetails = null;

      // 🚫 REMOVED TAX CALCULATION - ALWAYS 0
      let taxAmount = 0;
      let taxRate = 0;

      // ==================== COUPON VALIDATION ====================
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
            discountAmount = roundUSDToWhole(couponValidation.coupon.discountAmount);
            finalCouponCode = couponValidation.coupon.code;
            finalCouponId = couponValidation.coupon.id;
          } else {
            throw new Error(`Coupon validation failed: ${couponValidation.error}`);
          }
        } catch (error) {
          console.error('Coupon processing failed:', error);
        }
      }

      // ==================== FINAL AMOUNT CALCULATION ====================
      const userCountry = shippingAddress?.country || 'US';
      const displayCurrency = userCountry === 'IN' ? 'INR' : 'USD';
      const exchangeRate = 88;

      // 🎯 FINAL TOTAL = SUBTOTAL - DISCOUNT ONLY (NO SHIPPING, NO TAX)
      let finalAmountUSD = subtotalAmount - discountAmount;
      finalAmountUSD = Math.max(0.01, finalAmountUSD);

      // Round final amounts
      const finalAmountINR = roundToWholeNumber(finalAmountUSD * exchangeRate);
      finalAmountUSD = roundUSDToWhole(finalAmountUSD);

      // ==================== ORDER CREATION ====================
      let order;
      try {
        order = await prisma.$transaction(async (tx) => {
          // Create main order
          const newOrder = await tx.order.create({
            data: {
              userId,
              totalAmount: finalAmountINR,
              subtotalAmount: subtotalAmount,
              currency: displayCurrency,
              baseCurrency: 'USD',
              exchangeRate: exchangeRate,
              originalAmount: finalAmountUSD,
              paymentStatus: "PENDING", // Payment not completed yet
              fulfillmentStatus: "PLACED", // NOT "PROCESSING" yet
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

          // Create shipping record
          await tx.orderShipping.create({
            data: {
              orderId: newOrder.id,
              shippingCost: shippingCost,
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
        console.error('Transaction failed:', transactionError);
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

      // 🚫 REMOVED: Auto-forward to Printify
      // 🎯 ONLY send order confirmation email for now
      this.sendOrderConfirmationOnly(completeOrder).catch(err => {
        console.error('Order confirmation failed:', err);
      });

      return completeOrder;

    } catch (error) {
      console.error('Order creation error:', error);
      throw error;
    }
  }

    async forwardOrderToPrintify(orderId) {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          user: true,
          items: { 
            include: { 
              product: true 
            } 
          }
        }
      });

      if (!order) {
        throw new Error(`Order ${orderId} not found`);
      }

      // 🎯 CRITICAL: Check if payment is successful
      if (order.paymentStatus !== 'SUCCEEDED') {
        throw new Error(`Cannot forward order ${orderId} to Printify - payment status is ${order.paymentStatus}`);
      }

      // Check if already forwarded
      if (order.printifyOrderId) {
        logger.info(`Order ${orderId} already forwarded to Printify: ${order.printifyOrderId}`);
        return { alreadyForwarded: true, printifyOrderId: order.printifyOrderId };
      }

      logger.info(`🔄 Forwarding order ${orderId} to Printify after payment success`);

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

      // Update order with Printify ID and change fulfillment status
      await prisma.order.update({
        where: { id: order.id },
        data: {
          printifyOrderId: printifyOrder.id,
          fulfillmentStatus: "PROCESSING", // Now processing since payment is done
        },
      });

      logger.info(`✅ Order ${order.id} forwarded to Printify after payment: ${printifyOrder.id}`);
      
      // Send admin notification
      await this.sendAdminNewOrderNotification(order, printifyOrder.id);
      
      return printifyOrder;
    } catch (error) {
      logger.error(`❌ Failed to forward order ${orderId} to Printify:`, error);
      
      // Update order status to indicate Printify failure
      await prisma.order.update({
        where: { id: orderId },
        data: {
          fulfillmentStatus: "PRINTIFY_FAILED",
          orderNotes: `Printify forwarding failed: ${error.message}`
        },
      }).catch(updateErr => {
        logger.error(`❌ Failed to update order status after Printify failure:`, updateErr);
      });
      
      throw error;
    }
  }

  // 🔥 NEW: Send only order confirmation (without Printify details)
  async sendOrderConfirmationOnly(order) {
    try {
      if (!order.user?.email) {
        throw new Error(`Customer email not found for order ${order.id}`);
      }

      // Generate order confirmation email (pending payment)
      let customerEmailHtml;
      
      try {
        customerEmailHtml = await Promise.race([
          getOrderConfirmationEmail(order),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Email template timeout')), 10000)
          )
        ]);
      } catch (templateError) {
        console.error('❌ Customer email template error:', templateError);
        customerEmailHtml = this.getFallbackOrderEmail(order);
      }

      // Send order confirmation email
      await sendMail(
        order.user.email,
        `Order Received - #${order.id}`,
        customerEmailHtml
      );

      logger.info(`✅ Order confirmation sent to: ${order.user.email}`);
      
    } catch (error) {
      console.error(`❌ Order confirmation email failed for order ${order.id}:`, error);
      throw error;
    }
  }

  // 🔥 NEW: Send admin notification when order goes to Printify
  async sendAdminNewOrderNotification(order, printifyOrderId) {
    try {
      if (!process.env.ADMIN_EMAIL) return;

      let adminEmailHtml;
      
      try {
        adminEmailHtml = await Promise.race([
          getAdminNewOrderEmail(order, printifyOrderId),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Admin email template timeout')), 10000)
          )
        ]);
      } catch (templateError) {
        console.error('❌ Admin email template error:', templateError);
        adminEmailHtml = this.getFallbackAdminEmail(order, printifyOrderId);
      }

      await sendMail(
        process.env.ADMIN_EMAIL,
        `New Order - #${order.id}`,
        adminEmailHtml
      );

      logger.info(`✅ Admin notification sent for order ${order.id}`);
      
    } catch (error) {
      console.error('❌ Admin notification failed:', error);
      // Don't throw for admin email failures
    }
  }

  // // Update the getFallbackAdminEmail to include Printify ID
  // getFallbackAdminEmail(order, printifyOrderId = null) {
  //   return `
  //     <h2>New Order #${order.id}</h2>
  //     <p><strong>Customer:</strong> ${order.user?.name || 'N/A'}</p>
  //     <p><strong>Total:</strong> ${order.currency} ${order.totalAmount}</p>
  //     <p><strong>Payment Status:</strong> ${order.paymentStatus}</p>
  //     ${printifyOrderId ? `<p><strong>Printify Order ID:</strong> ${printifyOrderId}</p>` : ''}
  //     <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleString()}</p>
  //     <p>Please check the admin dashboard for details.</p>
  //   `;
  // }

  getFallbackOrderEmail(order) {
    return `
      <h2>Order Confirmation - #${order.id}</h2>
      <p>Thank you for your order! Your payment is being processed.</p>
      <p><strong>Order Total:</strong> ${order.currency} ${order.totalAmount}</p>
      <p>We will notify you once your payment is confirmed and your order goes into production.</p>
    `;
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
    

    return rate;
  }

  async handleAsyncOperations(order) {
    
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

      
      // Log detailed results
      results.forEach((result, index) => {
        const operation = index === 0 ? 'Printify' : 'Email';
        if (result.status === 'fulfilled') {
        } else {
          console.error(`❌ ${operation} operation failed for order ${order.id}:`, result.reason);
        }
      });
      
    } catch (error) {
      console.error(`💥 Async operations handler crashed for order ${order.id}:`, error);
    }
  }

  // async forwardToPrintify(order) {
    
  //   try {
  //     // Validate order data
  //     if (!order.items || order.items.length === 0) {
  //       throw new Error('No items in order');
  //     }

  //     const printifyItems = order.items.map((item) => ({
  //       ...item,
  //       printifyProductId: item.product.printifyProductId,
  //       sku: item.product.sku,
  //     }));


  //     const printifyOrder = await this.printifyService.createOrder({
  //       orderId: order.id,
  //       items: printifyItems,
  //       shippingAddress: order.shippingAddress,
  //       orderImage: order.orderImage,
  //     });


  //     // Update order with Printify ID
  //     await prisma.order.update({
  //       where: { id: order.id },
  //       data: {
  //         printifyOrderId: printifyOrder.id,
  //         fulfillmentStatus: "PROCESSING",
  //       },
  //     });

  //     logger.info(`✅ Order ${order.id} forwarded to Printify: ${printifyOrder.id}`);
      
  //     return printifyOrder;
  //   } catch (err) {
  //     console.error(`❌ Printify forwarding failed for order ${order.id}:`, err);
      
  //     // Update order status to indicate Printify failure
  //     await prisma.order.update({
  //       where: { id: order.id },
  //       data: {
  //         fulfillmentStatus: "PRINTIFY_FAILED",
  //       },
  //     }).catch(updateErr => {
  //       console.error(`❌ Failed to update order status after Printify failure:`, updateErr);
  //     });
      
  //     throw err; // Re-throw to be caught by Promise.allSettled
  //   }
  // }

  // async sendOrderNotifications(order) {
    
  //   try {
  //     if (!order.user?.email) {
  //       const errorMsg = `❌ Customer email not found for order ${order.id}`;
  //       console.error(errorMsg);
  //       throw new Error(errorMsg);
  //     }


  //     // Generate email content with timeout
  //     let customerEmailHtml, adminEmailHtml;
      
  //     try {
  //       // Customer email
  //       customerEmailHtml = await Promise.race([
  //         getOrderConfirmationEmail(order),
  //         new Promise((_, reject) => 
  //           setTimeout(() => reject(new Error('Email template timeout')), 10000)
  //         )
  //       ]);
  //     } catch (templateError) {
  //       console.error('❌ Customer email template error:', templateError);
  //       customerEmailHtml = this.getFallbackOrderEmail(order);
  //     }

  //     try {
  //       // Admin email - ADD THIS PART
  //       adminEmailHtml = await Promise.race([
  //         getAdminNewOrderEmail(order), // Use your existing function
  //         new Promise((_, reject) => 
  //           setTimeout(() => reject(new Error('Admin email template timeout')), 10000)
  //         )
  //       ]);
  //     } catch (templateError) {
  //       console.error('❌ Admin email template error:', templateError);
  //       adminEmailHtml = this.getFallbackAdminEmail(order);
  //     }

  //     // Send emails with better error handling
  //     const emailPromises = [];
      
  //     // Customer email
  //     emailPromises.push(
  //       sendMail(
  //         order.user.email,
  //         `Order Confirmation - #${order.id}`,
  //         customerEmailHtml
  //       ).then(() => {
  //         logger(`✅ Customer email sent to: ${order.user.email}`);
  //       }).catch(error => {
  //         throw new Error(`Customer email failed: ${error.message}`);
  //       })
  //     );

  //     // Admin email
  //     if (process.env.ADMIN_EMAIL) {
  //       emailPromises.push(
  //         sendMail(
  //           process.env.ADMIN_EMAIL,
  //           `New Order - #${order.id}`,
  //           adminEmailHtml
  //         ).then(() => {
  //         }).catch(error => {
  //           console.error('❌ Admin email failed:', error);
  //           // Don't throw for admin email failures
  //         })
  //       );
  //     }

  //     const results = await Promise.allSettled(emailPromises);
      
  //     return results;
      
  //   } catch (error) {
  //     console.error(`❌ Email notification failed for order ${order.id}:`, error);
  //     throw error;
  //   }
  // }

  // Add fallback admin email function
  
  getFallbackAdminEmail(order) {
    return `
      <h2>New Order #${order.id}</h2>
      <p><strong>Customer:</strong> ${order.user?.name || 'N/A'}</p>
      <p><strong>Total:</strong> ${order.currency} ${order.totalAmount}</p>
      <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleString()}</p>
      <p>Please check the admin dashboard for details.</p>
    `;
  }

  // async debugOrderSync(orderId) {
  //   try {
  //     const order = await this.getOrderById(orderId);
      
  //     if (!order) {
  //       return { success: false, error: `Order ${orderId} not found in database` };
  //     }

  //     const debugInfo = {
  //       orderId: order.id,
  //       database: {
  //         printifyOrderId: order.printifyOrderId,
  //         fulfillmentStatus: order.fulfillmentStatus,
  //         paymentStatus: order.paymentStatus,
  //         trackingNumber: order.trackingNumber,
  //         createdAt: order.createdAt
  //       }
  //     };

  //     const connectionTest = await this.printifyService.testConnection();
  //     debugInfo.printifyConnection = connectionTest;

  //     if (order.printifyOrderId) {
  //       try {
  //         const printifyOrder = await this.printifyService.getOrder(order.printifyOrderId);
  //         debugInfo.printifyOrder = {
  //           exists: true,
  //           status: printifyOrder.status,
  //           external_id: printifyOrder.external_id,
  //           shipments: printifyOrder.shipments,
  //           created_at: printifyOrder.created_at
  //         };
  //       } catch (error) {
  //         debugInfo.printifyOrder = {
  //           exists: false,
  //           error: error.message
  //         };
  //       }
  //     } else {
  //       debugInfo.printifyOrder = { exists: false, error: 'No Printify order ID in database' };
  //     }

  //     const recentOrders = await this.printifyService.listAllOrders(10);
  //     debugInfo.recentPrintifyOrders = recentOrders;

  //     return { success: true, data: debugInfo };
  //   } catch (error) {
  //     logger.error(`❌ Debug order sync failed for order ${orderId}:`, error);
  //     return { success: false, error: error.message };
  //   }
  // }

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


async cancelOrder(orderId, reason, cancelledBy) {
  try {
    // Step 1: Quick database fetch with correct field names
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        fulfillmentStatus: true,
        paymentStatus: true,
        razorpayPaymentId: true,
        totalAmount: true,
        printifyOrderId: true,
        userId: true,
        orderNotes: true
      }
    });

    if (!order) throw new Error("Order not found");

    // Step 2: Quick validation
    const cancellableStatuses = ['PLACED', 'PENDING', 'PROCESSING'];
    if (!cancellableStatuses.includes(order.fulfillmentStatus)) {
      throw new Error(`Cannot cancel order with status: ${order.fulfillmentStatus}`);
    }

    // Step 3: Quick payment check (non-blocking)
    let refundStatus = 'NOT_REQUIRED';
    let refundAmount = 0;
    
    // Use razorpayPaymentId instead of paymentId
    if (order.paymentStatus === 'SUCCEEDED' && order.razorpayPaymentId) {
      refundStatus = 'PENDING';
      refundAmount = order.totalAmount;
    } else {
      // FIXED: Replace logger with console.log
      console.log('ℹ️ OrderService: No refund required', {
        paymentStatus: order.paymentStatus,
        hasPaymentId: !!order.razorpayPaymentId
      });
    }

    // Step 4: Quick database update
    const updateData = {
      fulfillmentStatus: 'CANCELLED',
      paymentStatus: order.paymentStatus === 'SUCCEEDED' ? 'REFUND_PENDING' : 'FAILED',
      orderNotes: `${order.orderNotes || ''} | Cancelled: ${reason} | By: ${cancelledBy}`.substring(0, 500),
      cancelledAt: new Date(),
      cancellationReason: reason.substring(0, 255),
      cancelledBy: cancelledBy,
      refundStatus,
      refundAmount,
      refundRequestedAt: refundStatus === 'PENDING' ? new Date() : null
    };

    const cancelledOrder = await prisma.order.update({
      where: { id: orderId },
      data: updateData,
      include: { 
        user: { select: { id: true, email: true, name: true } },
        items: { 
          include: { 
            product: { select: { id: true, name: true } } 
          } 
        } 
      }
    });

    // Step 5: Start background processing (non-blocking)
    this.processBackgroundTasks(cancelledOrder, reason).catch(error => {
      console.error('❌ Background processing failed:', error.message);
    });

    return cancelledOrder;

  } catch (error) {
    console.error('❌ OrderService: Cancellation failed', { orderId, error: error.message });
    throw error;
  }
}

  // Separate method for background tasks
  async processBackgroundTasks(cancelledOrder, reason) {
    
    try {
      // 1. Printify cancellation (if needed)
      if (cancelledOrder.printifyOrderId) {
        try {
          await this.printifyService.cancelOrder(cancelledOrder.printifyOrderId);
        } catch (printifyError) {
          console.warn('⚠️ Printify cancellation failed (non-critical):', printifyError.message);
        }
      }

      // 2. Refund processing (if needed) - use razorpayPaymentId
      if (cancelledOrder.refundStatus === 'PENDING' && cancelledOrder.razorpayPaymentId) {
        await this.processRefund(cancelledOrder, reason);
      } else {
        logger('ℹ️ No refund processing needed', {
          refundStatus: cancelledOrder.refundStatus,
          hasPaymentId: !!cancelledOrder.razorpayPaymentId
        });
      }

      // 3. Send notifications
      await this.sendCancellationNotifications(cancelledOrder, reason, cancelledOrder.cancelledBy);

      
    } catch (error) {
      console.error('❌ Background tasks failed:', error.message);
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
        process.env.ADMIN_EMAIL || 'support@agumiyacollections.com',
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
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 2000; // 2 seconds
      
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
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
          data: { 
            refundStatus: 'PROCESSING',
            orderNotes: `${order.orderNotes} | Refund attempt ${attempt} started`
          }
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
            notes: `Razorpay Refund ID: ${refund.id} | Status: ${refund.status} | Amount: ${refund.amount}`
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
            orderNotes: `${order.orderNotes} | Refund processed successfully: ${refund.id}`
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
        console.error(`❌ Refund attempt ${attempt} failed:`, error);
        
        // Log payment failure
        await prisma.paymentLog.create({
          data: {
            orderId: order.id,
            userId: order.userId,
            paymentId: `refund_failed_attempt_${attempt}_${Date.now()}`,
            amount: order.refundAmount,
            status: 'FAILED',
            errorMessage: error.message,
            gateway: 'RAZORPAY',
            rawResponse: { 
              error: error.toString(),
              attempt: attempt,
              timestamp: new Date().toISOString()
            }
          }
        });

        // If last attempt, mark as failed
        if (attempt === MAX_RETRIES) {
          await prisma.order.update({
            where: { id: order.id },
            data: { 
              refundStatus: 'FAILED',
              orderNotes: `${order.orderNotes} | Refund failed after ${MAX_RETRIES} attempts: ${error.message}`
            }
          });

          logger.error(`❌ Refund processing failed for order ${order.id} after ${MAX_RETRIES} attempts:`, error);
          
          // Send failure notification
          await this.sendRefundNotification(order, error.message);
          throw error;
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      }
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