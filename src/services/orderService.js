// src/services/orderService.js
import prisma from "../config/prisma.js";
import { PrintifyOrderService } from "./printifyOrderService.js";
import { sendMail } from "../utils/mailer.js";
import { getOrderConfirmationEmail, getAdminNewOrderEmail, getOrderShippedEmail, getOrderCancelledEmail, getAdminCancellationEmail,getRefundProcessedEmail } from "../utils/emailTemplates.js";
import logger from "../utils/logger.js";
import { ProductVariantService } from "./productVariantService.js";
import { FulfillmentStatus, PaymentStatus } from "@prisma/client";
import RazorpayService from "./razorpayService.js"; // ✅ Change this line


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


// services/orderService.js - PRODUCTION FIX
async createOrderFromPayment(userId, tempOrderData, razorpayPaymentId, razorpayOrderId) {
  let order = null;
  let attempts = 0;
  const maxAttempts = 3;

  // 🔥 RETRY LOOP FOR DATABASE CONFLICTS
  while (attempts < maxAttempts && !order) {
    try {

      // 🔥 STEP 1: CHECK FOR DUPLICATE PAYMENT
      const existingOrder = await prisma.order.findFirst({
        where: {
          razorpayPaymentId: razorpayPaymentId,
          paymentStatus: "SUCCEEDED"
        },
        include: {
          items: {
            include: {
              product: true
            }
          }
        }
      });

      if (existingOrder) {
        return existingOrder;
      }

      // 🔥 STEP 2: CREATE ORDER IN TRANSACTION
      order = await prisma.$transaction(async (tx) => {
        // Extract data with defaults
        const { 
          items = [], 
          shippingAddress = {}, 
          orderImage = null, 
          orderNotes = null, 
          couponCode = null,
          subtotalAmount = 0,
          shippingCost = 0,
          taxAmount = 0,  
          taxRate = 0,
          discountAmount = 0,
          finalAmountUSD = 0,
          finalAmountINR = 0,
          displayCurrency = 'USD',
          exchangeRate = 1
        } = tempOrderData;


        // 🔥 CREATE MAIN ORDER
        const newOrder = await tx.order.create({
          data: {
            userId,
            totalAmount: finalAmountINR,
            subtotalAmount: subtotalAmount,
            shippingCost: shippingCost,
            taxAmount: taxAmount,
            taxRate: taxRate,
            currency: displayCurrency,
            baseCurrency: 'USD',
            exchangeRate: exchangeRate,
            originalAmount: finalAmountUSD,
            paymentStatus: "SUCCEEDED",
            fulfillmentStatus: "PLACED", 
            shippingAddress: shippingAddress,
            orderImage: orderImage,
            orderNotes: orderNotes,
            couponCode: couponCode,
            discountAmount: discountAmount,
            razorpayPaymentId: razorpayPaymentId,
            razorpayOrderId: razorpayOrderId,
            paidAt: new Date(),
            items: {
              create: items.map((item, index) => {
                // 🔥 VALIDATE REQUIRED FIELDS
                if (!item.productId) {
                  throw new Error(`Item ${index} missing productId`);
                }
                if (!item.quantity || item.quantity < 1) {
                  throw new Error(`Item ${index} has invalid quantity: ${item.quantity}`);
                }

                return {
                  productId: item.productId,
                  quantity: item.quantity,
                  price: item.price || 0,
                  printifyVariantId: item.printifyVariantId?.toString() || null,
                  printifyBlueprintId: item.printifyBlueprintId || null,
                  printifyPrintProviderId: item.printifyPrintProviderId || null,
                  size: item.size || null,
                  color: item.color || null,
                  phoneModel: item.phoneModel || null,
                  finishType: item.finishType || null,
                  material: item.material || null,
                  style: item.style || null,
                  customOption1: item.customOption1 || null,
                  customOption2: item.customOption2 || null,
                  variantTitle: item.variantTitle || null,
                };
              }),
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


        // 🔥 CREATE SHIPPING RECORD
        await tx.orderShipping.create({
          data: {
            orderId: newOrder.id,
            shippingCost: shippingCost,
            status: "PENDING",
          },
        });


        return newOrder;
      }, {
        maxWait: 10000,
        timeout: 15000,
      });


    } catch (transactionError) {
      attempts++;

      // 🔥 SPECIFIC ERROR HANDLING
      if (transactionError.message.includes('Unique constraint')) {
        if (transactionError.message.includes('razorpay_payment_id')) {
          // Duplicate payment - try to find existing order
          const existingOrder = await prisma.order.findFirst({
            where: {
              razorpayPaymentId: razorpayPaymentId
            },
            include: {
              items: {
                include: {
                  product: true
                }
              }
            }
          });

          if (existingOrder) {
            order = existingOrder;
            break;
          }
        } else if (transactionError.message.includes('id')) {
          // Auto-increment ID conflict - wait and retry
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 500));
            continue; // Retry
          }
        }
      }

      // 🔥 OTHER ERRORS - THROW AFTER MAX ATTEMPTS
      if (attempts >= maxAttempts) {
        throw new Error(`Order creation failed: ${transactionError.message}`);
      }
    }
  }

  // 🔥 VALIDATE FINAL ORDER
  if (!order || !order.id) {
    throw new Error("Order creation failed - no order returned after retries");
  }


  // 🔥 STEP 3: FETCH COMPLETE ORDER
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


  // 🔥 STEP 4: COUPON USAGE (NON-BLOCKING)
  if (tempOrderData.couponCode && tempOrderData.discountAmount > 0) {
    try {
      const coupon = await prisma.coupon.findUnique({
        where: { code: tempOrderData.couponCode }
      });
      
      if (coupon) {
        await prisma.$transaction(async (tx) => {
          await tx.couponUsage.create({
            data: {
              couponId: coupon.id,
              userId: userId,
              orderId: order.id,
              discountAmount: tempOrderData.discountAmount
            }
          });

          await tx.coupon.update({
            where: { id: coupon.id },
            data: { 
              usedCount: { increment: 1 }
            }
          });
        });
      }
    } catch (couponError) {
      console.error('❌ Failed to record coupon usage:', couponError);
      // Don't fail the order for coupon errors
    }
  }

  // 🔥 STEP 5: ASYNC OPERATIONS (DON'T BLOCK)
  try {
    // Printify forwarding
    this.forwardOrderToPrintify(completeOrder.id).catch(error => {
      console.error('❌ Printify forwarding failed:', error);
    });

    // Email sending
    this.sendOrderConfirmationOnly(completeOrder).catch(error => {
      console.error('❌ Email sending failed:', error);
    });
    
  } catch (asyncError) {
    console.error('❌ Async operations failed:', asyncError);
  }

  return completeOrder;
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
        return { alreadyForwarded: true, printifyOrderId: order.printifyOrderId };
      }


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

      
    } catch (error) {
      console.error('❌ Admin notification failed:', error);
      // Don't throw for admin email failures
    }
  }


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
    const exchangeRate = 88.72;
    
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


  getFallbackAdminEmail(order) {
    return `
      <h2>New Order #${order.id}</h2>
      <p><strong>Customer:</strong> ${order.user?.name || 'N/A'}</p>
      <p><strong>Total:</strong> ${order.currency} ${order.totalAmount}</p>
      <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleString()}</p>
      <p>Please check the admin dashboard for details.</p>
    `;
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

    } catch (error) {
      logger.error(`❌ Failed to send shipping notification: ${error.message}`);
    }
  }


async cancelOrder(orderId, reason, cancelledBy) {
  try {
    // Step 1: Get order with ALL data
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
        orderNotes: true,
        currency: true,
        subtotalAmount: true,
        taxAmount: true,
        discountAmount: true,
        shippingCost: true,
        exchangeRate: true,
        createdAt: true,
        shippingAddress: true,
        user: { select: { id: true, email: true, name: true } },
        items: { 
          include: { 
            product: { 
              select: { 
                id: true, 
                name: true, 
                images: true 
              } 
            } 
          } 
        }
      }
    });

    if (!order) throw new Error("Order not found");

    // Step 2: Quick validation
    const cancellableStatuses = ['PLACED', 'PENDING', 'PROCESSING'];
    if (!cancellableStatuses.includes(order.fulfillmentStatus)) {
      throw new Error(`Cannot cancel order with status: ${order.fulfillmentStatus}`);
    }

    // ✅ ENHANCED PAYMENT VALIDATION
    let refundStatus = 'NOT_REQUIRED';
    let refundAmount = 0;
    
    if (order.paymentStatus === 'SUCCEEDED' && order.razorpayPaymentId) {
      try {
        // Verify payment actually exists before setting refund status
        const paymentExists = await this.razorpayService.verifyPayment(order.razorpayPaymentId);
        if (paymentExists) {
          refundStatus = 'PENDING';
          refundAmount = order.totalAmount;
        } else {
          refundStatus = 'NOT_REQUIRED';
        }
      } catch (verifyError) {
        console.warn('⚠️ Payment verification failed:', verifyError.message);
        refundStatus = 'NOT_REQUIRED';
      }
    } else {
      console.error('ℹ️ OrderService: No refund required', {
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

    // Update order
    await prisma.order.update({
      where: { id: orderId },
      data: updateData
    });

    // Create the cancelled order object manually
    const cancelledOrder = {
      ...order,
      ...updateData,
      refundStatus,
      refundAmount,
      cancelledAt: new Date()
    };


    // Step 5: Start background processing
    this.processBackgroundTasks(cancelledOrder, reason).catch(error => {
      console.error('❌ Background processing failed:', error);
    });

    return cancelledOrder;

  } catch (error) {
    console.error('❌ OrderService: Cancellation failed', { orderId, error: error.message });
    throw error;
  }
}

async processBackgroundTasks(cancelledOrder, reason) {
  try {
    
    // 1. Printify cancellation
    if (cancelledOrder.printifyOrderId) {
      try {
        await this.printifyService.cancelOrder(cancelledOrder.printifyOrderId);
      } catch (printifyError) {
        console.warn('⚠️ Printify cancellation failed:', printifyError.message);
      }
    }

    // 2. Refund processing - WITH ENHANCED VALIDATION
    if (cancelledOrder.refundStatus === 'PENDING' && cancelledOrder.razorpayPaymentId) {
      try {
        // Double-check payment exists before refund attempt
        const paymentExists = await this.razorpayService.verifyPayment(cancelledOrder.razorpayPaymentId);
        if (paymentExists) {
          await this.processRefund(cancelledOrder, reason);
        } else {
          // Update order to reflect no refund needed
          await prisma.order.update({
            where: { id: cancelledOrder.id },
            data: { 
              refundStatus: 'NOT_REQUIRED',
              orderNotes: `${cancelledOrder.orderNotes} | Refund skipped - payment not found`
            }
          });
        }
      } catch (refundError) {
        console.error('❌ Refund processing failed:', refundError.message);
      }
    } else {
      console.error('ℹ️ No refund processing needed');
    }

    // 3. Send notifications
    try {
      await this.sendCancellationNotifications(cancelledOrder, reason, cancelledOrder.cancelledBy);
    } catch (emailError) {
      console.error('❌ Email notifications failed:', emailError.message);
    }
    
    
  } catch (error) {
    console.error('❌ Background tasks failed:', error.message);
  }
}

// FIXED: Email notification method with proper async handling
async sendCancellationNotifications(order, reason, cancelledBy) {
  try {

    // Step 1: Customer email - ADD AWAIT
    const customerEmailContent = await getOrderCancelledEmail(order, reason, cancelledBy);
    
    if (!customerEmailContent || typeof customerEmailContent !== 'string' || customerEmailContent.length < 10) {
      console.error('❌ Invalid customer email content:', {
        type: typeof customerEmailContent,
        length: customerEmailContent?.length
      });
      // Don't throw - use fallback
      throw new Error('Customer email content is invalid');
    }
    
    await sendMail(
      order.user.email,
      `Order #${order.id} Cancellation Confirmation - Agumiya Collections`,
      customerEmailContent
    );
    
    // Step 2: Admin email - ADD AWAIT
    const adminEmailContent = await getAdminCancellationEmail(order, reason, cancelledBy);
    
    if (!adminEmailContent || typeof adminEmailContent !== 'string' || adminEmailContent.length < 10) {
      console.error('❌ Invalid admin email content:', {
        type: typeof adminEmailContent,
        length: adminEmailContent?.length
      });
      // Don't throw - use fallback
      throw new Error('Admin email content is invalid');
    }
    
    await sendMail(
      process.env.ADMIN_EMAIL || 'support@agumiyacollections.com',
      `🚨 Order Cancellation Alert - #${order.id}`,
      adminEmailContent
    );

    
  } catch (error) {
    console.error('❌ Failed to send cancellation notifications:', error.message);
    // Log but don't throw - email failure shouldn't break cancellation
    await this.logEmailFailure(order.id, error);
  }
}

// Add helper method for logging email failures
async logEmailFailure(orderId, error) {
  try {
    await prisma.paymentLog.create({
      data: {
        orderId: orderId,
        paymentId: `email_failure_${Date.now()}`,
        amount: 0,
        status: 'FAILED',
        errorMessage: `Email notification failed: ${error.message}`,
        gateway: 'EMAIL_SYSTEM',
        rawResponse: { error: error.toString() }
      }
    });
  } catch (logError) {
    console.error('❌ Failed to log email failure:', logError.message);
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
      
      // ✅ FIX: Add await if getRefundProcessedEmail is async
      const emailContent = await getRefundProcessedEmail(order, refundId);
      
      await sendMail(
        order.user.email,
        `Refund Processed for Order #${order.id}`,
        emailContent
      );

    } catch (error) {
      console.error('❌ Failed to send refund notification:', error.message);
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
      select: {
        id: true,
        userId: true,
        totalAmount: true,
        subtotalAmount: true,
        shippingCost: true,
        taxAmount: true, 
        taxRate: true,
        discountAmount: true,
        currency: true,
        couponCode: true,
        paymentStatus: true,
        fulfillmentStatus: true,
        shippingAddress: true,
        createdAt: true,
        updatedAt: true,
        printifyOrderId: true,
        trackingNumber: true,
        trackingUrl: true,
        carrier: true,
        orderNotes: true,
        orderImage: true,
        items: {
          select: {
            id: true,
            quantity: true,
            price: true,
            size: true,
            color: true,
            printifyVariantId: true,
            printifyBlueprintId: true,
            printifyPrintProviderId: true,
            product: {
              select: { 
                id: true, 
                name: true, 
                price: true, 
                images: true 
              }
            }
          }
        },
        shipping: {
          select: {
            shippingCost: true,
            status: true
          }
        },
        cancelledAt: true,
        cancellationReason: true,
        cancelledBy: true,
        refundStatus: true,
        refundAmount: true,
        refundRequestedAt: true,
        refundProcessedAt: true,
        razorpayRefundId: true
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
    ].filter(Boolean);
  }

  // Get orders with pagination - FIXED: Using select instead of include for items
  const orders = await prisma.order.findMany({
    where,
    select: {
      id: true,
      totalAmount: true,
      subtotalAmount: true,
      shippingCost: true,
      taxAmount: true,
      taxRate: true,
      discountAmount: true,
      currency: true,
      couponCode: true,
      paymentStatus: true,
      fulfillmentStatus: true,
      shippingAddress: true,
      createdAt: true,
      updatedAt: true,
      printifyOrderId: true,
      trackingNumber: true,
      trackingUrl: true,
      carrier: true,
      orderNotes: true,
      orderImage: true,
      user: {
        select: { id: true, name: true, email: true }
      },
      items: {
        select: {
          id: true,
          quantity: true,
          price: true,
          size: true,
          color: true,
          printifyVariantId: true,
          printifyBlueprintId: true,
          printifyPrintProviderId: true,
          product: {
            select: { id: true, name: true, price: true, images: true }
          }
        }
      }
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

async updateOrderStatus(orderId, statusData) {
  const { paymentStatus, fulfillmentStatus } = statusData;

  const updatedOrder = await prisma.order.update({
    where: { id: orderId },
    data: {
      ...(paymentStatus && { paymentStatus }),
      ...(fulfillmentStatus && { fulfillmentStatus }),
      updatedAt: new Date(),
    },
    include: {
      user: true,
      items: { 
        include: { 
          product: true 
        } 
      },
    },
  });

  return updatedOrder;
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