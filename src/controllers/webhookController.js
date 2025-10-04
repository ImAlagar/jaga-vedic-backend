import crypto from 'crypto';
import prisma from '../config/prisma.js';
import logger from '../utils/logger.js';

export async function handleWebhook(req, res) {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const razorpaySignature = req.headers['x-razorpay-signature'];
    
    logger.info('📩 Webhook received', {
      event: req.body?.event,
      signature: razorpaySignature ? 'present' : 'missing'
    });

    // Verify webhook signature
    if (!razorpaySignature) {
      logger.error('❌ Webhook signature missing');
      return res.status(400).json({ error: 'Signature missing' });
    }

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      logger.error('❌ Webhook signature verification failed', {
        expected: expectedSignature.substring(0, 10) + '...',
        received: razorpaySignature.substring(0, 10) + '...'
      });
      return res.status(400).json({ error: 'Invalid signature' });
    }

    logger.info('✅ Webhook signature verified');

    // Process webhook event
    await processWebhookEvent(req.body);

    res.status(200).json({ 
      success: true, 
      message: 'Webhook processed successfully',
      event: req.body.event
    });
  } catch (error) {
    logger.error('💥 Webhook processing error', { 
      error: error.message,
      stack: error.stack 
    });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

async function processWebhookEvent(webhookData) {
  const { event, payload, created_at } = webhookData;

  logger.info(`🔄 Processing webhook event: ${event}`, {
    webhookId: webhookData.id,
    timestamp: new Date(created_at * 1000).toISOString()
  });

  try {
    switch (event) {
      case 'payment.captured':
        await handlePaymentCaptured(payload.payment.entity);
        break;

      case 'payment.failed':
        await handlePaymentFailed(payload.payment.entity);
        break;

      case 'refund.created':
        await handleRefundCreated(payload.refund.entity);
        break;

      default:
        logger.warn('⚠️ Unhandled webhook event', { event });
    }

    logger.info(`✅ Successfully processed webhook: ${event}`);
  } catch (error) {
    logger.error(`❌ Webhook event processing failed: ${event}`, { 
      error: error.message
    });
    throw error;
  }
}

async function handlePaymentCaptured(payment) {
  const { order_id, id: payment_id, amount, currency } = payment;

  logger.info('💰 Processing payment captured', { 
    razorpayOrderId: order_id, 
    paymentId: payment_id,
    amount: amount / 100,
    currency
  });

  // Find order by Razorpay order ID
  const order = await prisma.order.findFirst({
    where: { razorpayOrderId: order_id }
  });

  if (!order) {
    logger.error('❌ Order not found for payment', { razorpayOrderId: order_id });
    return;
  }

  // Update order status
  await prisma.order.update({
    where: { id: order.id },
    data: {
      paymentStatus: 'SUCCEEDED',
      razorpayPaymentId: payment_id,
      fulfillmentStatus: 'PROCESSING',
      updatedAt: new Date()
    }
  });

  // Log payment success
  await prisma.paymentLog.create({
    data: {
      orderId: order.id,
      paymentId: payment_id,
      amount: amount / 100,
      currency,
      status: 'CAPTURED',
      gateway: 'RAZORPAY',
      rawResponse: JSON.stringify(payment),
      createdAt: new Date()
    }
  });

  logger.info('✅ Payment captured and order updated', {
    orderId: order.id,
    paymentId: payment_id,
    amount: amount / 100
  });
}

async function handlePaymentFailed(payment) {
  const { order_id, id: payment_id, error_description, amount } = payment;

  logger.warn('❌ Processing payment failed', {
    razorpayOrderId: order_id,
    paymentId: payment_id,
    error: error_description,
    amount: amount / 100
  });

  const order = await prisma.order.findFirst({
    where: { razorpayOrderId: order_id }
  });

  if (order) {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: 'FAILED',
        updatedAt: new Date()
      }
    });

    // Log payment failure
    await prisma.paymentLog.create({
      data: {
        orderId: order.id,
        paymentId: payment_id,
        amount: amount / 100,
        status: 'FAILED',
        gateway: 'RAZORPAY',
        errorMessage: error_description,
        rawResponse: JSON.stringify(payment),
        createdAt: new Date()
      }
    });

    logger.info('✅ Payment failure recorded', { orderId: order.id });
  }
}

async function handleRefundCreated(refund) {
  const { payment_id, id: refund_id, amount, status } = refund;

  logger.info('💸 Processing refund created', {
    paymentId: payment_id,
    refundId: refund_id,
    amount: amount / 100,
    status
  });

  const order = await prisma.order.findFirst({
    where: { razorpayPaymentId: payment_id }
  });

  if (order) {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: 'REFUNDED',
        updatedAt: new Date()
      }
    });

    // Create refund record
    await prisma.refund.create({
      data: {
        orderId: order.id,
        refundId: refund_id,
        amount: amount / 100,
        status: status === 'processed' ? 'PROCESSED' : 'PENDING',
        reason: 'Customer request',
        processedAt: new Date(),
        createdAt: new Date()
      }
    });

    logger.info('✅ Refund processed successfully', { 
      orderId: order.id,
      refundId: refund_id
    });
  }
}