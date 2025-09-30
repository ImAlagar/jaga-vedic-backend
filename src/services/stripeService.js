// src/services/stripeService.js
import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger.js';

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export class StripeService {
  
  // Create or retrieve Stripe Customer
  async getOrCreateCustomer(user) {
    try {
      // Check if user already has a Stripe customer ID
      if (user.stripeCustomerId) {
        try {
          const existingCustomer = await stripe.customers.retrieve(user.stripeCustomerId);
          return existingCustomer;
        } catch (error) {
          // Customer might be deleted in Stripe, create a new one
          logger.warn(`Stripe customer ${user.stripeCustomerId} not found, creating new one`);
        }
      }

      // Create new customer
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        phone: user.phone,
        metadata: {
          userId: user.id.toString(),
          source: 'ecommerce-store'
        }
      });

      // Update user with Stripe customer ID
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customer.id }
      });

      logger.info(`✅ Created new Stripe customer: ${customer.id} for user: ${user.email}`);
      return customer;
    } catch (error) {
      logger.error('❌ Failed to create Stripe customer:', error);
      throw new Error(`Failed to create Stripe customer: ${error.message}`);
    }
  }

  // Create Payment Intent (Recommended for real-time updates)
  async createPaymentIntent(order, user) {
    try {
      const customer = await this.getOrCreateCustomer(user);
      
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(order.totalAmount * 100), // Convert to cents
        currency: 'usd',
        customer: customer.id,
        metadata: {
          orderId: order.id.toString(),
          userId: user.id.toString(),
          orderType: 'printify'
        },
        automatic_payment_methods: {
          enabled: true,
        },
        description: `Order #${order.id} - ${order.items.length} items`,
        shipping: this.formatShippingAddress(order.shippingAddress),
        // Setup future usage if you want to save payment method
        setup_future_usage: 'on_session',
      });

      // Update order with payment intent ID
      await prisma.order.update({
        where: { id: order.id },
        data: { 
          stripePaymentIntentId: paymentIntent.id,
          stripeCustomerId: customer.id,
          paymentStatus: 'PENDING'
        }
      });

      logger.info(`✅ Created Payment Intent: ${paymentIntent.id} for order: ${order.id}`);

      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: order.totalAmount,
        currency: 'usd',
        status: paymentIntent.status
      };
    } catch (error) {
      logger.error('❌ Failed to create payment intent:', error);
      throw new Error(`Failed to create payment intent: ${error.message}`);
    }
  }

  // Confirm Payment Intent (Frontend calls this after card details)
  async confirmPaymentIntent(paymentIntentId, paymentMethodId) {
    try {
      const paymentIntent = await stripe.paymentIntents.confirm(
        paymentIntentId,
        { payment_method: paymentMethodId }
      );

      logger.info(`✅ Payment Intent ${paymentIntentId} confirmed: ${paymentIntent.status}`);
      return paymentIntent;
    } catch (error) {
      logger.error('❌ Failed to confirm payment intent:', error);
      throw new Error(`Payment confirmation failed: ${error.message}`);
    }
  }

  // Retrieve Payment Intent status
  async getPaymentIntent(paymentIntentId) {
    try {
      return await stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (error) {
      throw new Error(`Failed to retrieve payment intent: ${error.message}`);
    }
  }

  // Create Checkout Session (Alternative approach)
  async createCheckoutSession(order, user, successUrl, cancelUrl) {
    try {
      const customer = await this.getOrCreateCustomer(user);
      
      const session = await stripe.checkout.sessions.create({
        customer: customer.id,
        payment_method_types: ['card'],
        line_items: order.items.map(item => ({
          price_data: {
            currency: 'usd',
            product_data: {
              name: item.product.name,
              images: item.product.images.slice(0, 1), // First image only
              description: `Size: ${item.size}, Color: ${item.color}`,
              metadata: {
                productId: item.product.id.toString(),
                variantId: item.printifyVariantId
              }
            },
            unit_amount: Math.round(item.price * 100),
          },
          quantity: item.quantity,
        })),
        mode: 'payment',
        success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}&order_id=${order.id}`,
        cancel_url: `${cancelUrl}?order_id=${order.id}`,
        client_reference_id: order.id.toString(),
        metadata: {
          orderId: order.id.toString(),
          userId: user.id.toString()
        },
        shipping_address_collection: {
          allowed_countries: ['US', 'CA', 'GB', 'IN', 'AU'], // Adjust as needed
        },
        custom_text: {
          submit: {
            message: 'Your custom print order will be processed immediately after payment.'
          }
        },
        expires_at: Math.floor(Date.now() / 1000) + (30 * 60), // 30 minutes
      });

      // Update order with session ID
      await prisma.order.update({
        where: { id: order.id },
        data: { 
          stripeSessionId: session.id,
          stripeCustomerId: customer.id,
          paymentStatus: 'PENDING'
        }
      });

      logger.info(`✅ Created Checkout Session: ${session.id} for order: ${order.id}`);
      return session;
    } catch (error) {
      logger.error('❌ Failed to create checkout session:', error);
      throw new Error(`Failed to create checkout session: ${error.message}`);
    }
  }

  // Handle Webhook Events (Real-time payment updates)
  async handleWebhookEvent(payload, signature) {
    try {
      const event = stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );

      logger.info(`🔔 Received Stripe event: ${event.type}`);

      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSuccess(event.data.object);
          break;
        
        case 'payment_intent.payment_failed':
          await this.handlePaymentFailure(event.data.object);
          break;
        
        case 'payment_intent.processing':
          await this.handlePaymentProcessing(event.data.object);
          break;
        
        case 'checkout.session.completed':
          await this.handleCheckoutCompletion(event.data.object);
          break;
        
        case 'charge.refunded':
          await this.handleRefund(event.data.object);
          break;
        
        default:
          logger.info(`⚡ Unhandled event type: ${event.type}`);
      }

      return { received: true, event: event.type };
    } catch (error) {
      logger.error('❌ Webhook error:', error);
      throw new Error(`Webhook error: ${error.message}`);
    }
  }

  // Handle successful payment
  async handlePaymentSuccess(paymentIntent) {
    const orderId = parseInt(paymentIntent.metadata.orderId);
    
    const order = await prisma.order.update({
      where: { id: orderId },
      data: { 
        paymentStatus: 'SUCCEEDED',
        paymentMethod: paymentIntent.payment_method_types[0],
        fulfillmentStatus: 'PROCESSING',
        updatedAt: new Date()
      },
      include: {
        user: true,
        items: { include: { product: true } }
      }
    });

    logger.info(`✅ Payment succeeded for order ${orderId}`);
    
    // Here you can trigger additional actions:
    // - Send confirmation email
    // - Update inventory
    // - Trigger Printify order creation
    // - Send real-time notification to admin
  }

  // Handle payment failure
  async handlePaymentFailure(paymentIntent) {
    const orderId = parseInt(paymentIntent.metadata.orderId);
    
    await prisma.order.update({
      where: { id: orderId },
      data: { 
        paymentStatus: 'FAILED',
        paymentError: paymentIntent.last_payment_error?.message || 'Payment failed',
        updatedAt: new Date()
      }
    });

    logger.warn(`⚠️ Payment failed for order ${orderId}: ${paymentIntent.last_payment_error?.message}`);
  }

  // Handle payment processing
  async handlePaymentProcessing(paymentIntent) {
    const orderId = parseInt(paymentIntent.metadata.orderId);
    
    await prisma.order.update({
      where: { id: orderId },
      data: { 
        paymentStatus: 'PENDING', // Or create a PROCESSING status
        updatedAt: new Date()
      }
    });

    logger.info(`🔄 Payment processing for order ${orderId}`);
  }

  // Handle checkout completion
  async handleCheckoutCompletion(session) {
    const orderId = parseInt(session.client_reference_id);
    
    const order = await prisma.order.update({
      where: { id: orderId },
      data: { 
        paymentStatus: 'SUCCEEDED',
        stripePaymentIntentId: session.payment_intent,
        fulfillmentStatus: 'PROCESSING',
        updatedAt: new Date()
      },
      include: {
        user: true,
        items: { include: { product: true } }
      }
    });

    logger.info(`✅ Checkout completed for order ${orderId}`);
  }

  // Handle refund
  async handleRefund(charge) {
    const paymentIntentId = charge.payment_intent;
    const order = await prisma.order.findFirst({
      where: { stripePaymentIntentId: paymentIntentId }
    });

    if (order) {
      await prisma.order.update({
        where: { id: order.id },
        data: { 
          paymentStatus: 'REFUNDED',
          updatedAt: new Date()
        }
      });

      logger.info(`💸 Refund processed for order ${order.id}`);
    }
  }

  // Format shipping address for Stripe
  formatShippingAddress(shippingAddress) {
    if (!shippingAddress) return undefined;

    return {
      name: `${shippingAddress.firstName} ${shippingAddress.lastName}`,
      address: {
        line1: shippingAddress.address1,
        line2: shippingAddress.address2 || '',
        city: shippingAddress.city,
        state: shippingAddress.region,
        postal_code: shippingAddress.zipCode,
        country: shippingAddress.country,
      },
      phone: shippingAddress.phone,
    };
  }

  // Create refund
  async createRefund(orderId, amount = null) {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { user: true }
      });

      if (!order) throw new Error('Order not found');
      if (!order.stripePaymentIntentId) throw new Error('No payment intent found');

      const refundData = {
        payment_intent: order.stripePaymentIntentId,
        metadata: {
          orderId: order.id.toString(),
          reason: 'customer_request'
        }
      };

      if (amount) {
        refundData.amount = Math.round(amount * 100);
      }

      const refund = await stripe.refunds.create(refundData);

      await prisma.order.update({
        where: { id: orderId },
        data: { 
          paymentStatus: 'REFUNDED',
          updatedAt: new Date()
        }
      });

      logger.info(`💸 Refund created: ${refund.id} for order: ${orderId}`);
      return refund;
    } catch (error) {
      logger.error('❌ Failed to create refund:', error);
      throw new Error(`Refund failed: ${error.message}`);
    }
  }
}