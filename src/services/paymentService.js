import razorpayService from './razorpayService.js';
import prisma from '../config/prisma.js';
import logger from '../utils/logger.js';

class PaymentService {
  async initiatePayment(orderData) {
    try {
      const { orderId, amount, currency, userId, products } = orderData;

      // Validate order exists and is in pending state
      const existingOrder = await prisma.order.findUnique({
        where: { id: orderId },
        include: { user: true }
      });

      if (!existingOrder) {
        throw new Error('Order not found');
      }

      if (existingOrder.paymentStatus !== 'PENDING') {
        throw new Error('Order payment already processed');
      }

      // Create Razorpay order
      const razorpayOrder = await razorpayService.createOrder({
        amount,
        currency,
        receipt: `order_${orderId}`,
        notes: {
          orderId: orderId.toString(),
          userId: userId.toString()
        }
      });

      // Update order with Razorpay order ID
      await prisma.order.update({
        where: { id: orderId },
        data: {
          razorpayOrderId: razorpayOrder.order.id,
          paymentStatus: 'PENDING'
        }
      });

      logger.info('Payment initiated successfully', { 
        orderId, 
        razorpayOrderId: razorpayOrder.order.id 
      });

      return {
        success: true,
        order: razorpayOrder.order,
        key: razorpayOrder.key,
        orderId: existingOrder.id
      };
    } catch (error) {
      logger.error('Payment initiation failed', { error: error.message });
      throw error;
    }
  }

  async verifyAndCapturePayment(paymentData) {
    try {
      const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = paymentData;

      // Verify payment signature
      const isValid = await razorpayService.verifyPaymentSignature({
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
      });

      if (!isValid) {
        throw new Error('Invalid payment signature');
      }

      // Fetch payment details from Razorpay
      const paymentDetails = await razorpayService.fetchPayment(razorpay_payment_id);

      if (paymentDetails.status !== 'captured') {
        throw new Error('Payment not captured');
      }

      // Update order payment status
      const updatedOrder = await prisma.order.update({
        where: { razorpayOrderId: razorpay_order_id },
        data: {
          paymentStatus: 'SUCCEEDED',
          razorpayPaymentId: razorpay_payment_id,
          fulfillmentStatus: 'PROCESSING',
          updatedAt: new Date()
        },
        include: {
          user: true,
          items: {
            include: {
              product: true
            }
          }
        }
      });

      // Create payment log
      await prisma.paymentLog.create({
        data: {
          orderId: updatedOrder.id,
          paymentId: razorpay_payment_id,
          amount: updatedOrder.totalAmount,
          currency: 'INR',
          status: 'CAPTURED',
          gateway: 'RAZORPAY',
          rawResponse: JSON.stringify(paymentDetails),
          createdAt: new Date()
        }
      });

      logger.info('Payment verified and captured successfully', {
        orderId: updatedOrder.id,
        paymentId: razorpay_payment_id
      });

      return {
        success: true,
        order: updatedOrder,
        payment: paymentDetails
      };
    } catch (error) {
      logger.error('Payment verification failed', { error: error.message });
      
      // Update order as failed
      try {
        const failedOrder = await prisma.order.findFirst({
          where: { razorpayOrderId: paymentData.razorpay_order_id }
        });

        if (failedOrder) {
          await this.handlePaymentFailure(failedOrder.id, error.message);
        }
      } catch (dbError) {
        logger.error('Failed to update payment failure status', { error: dbError.message });
      }

      throw error;
    }
  }

  async handlePaymentFailure(orderId, errorMessage) {
    try {
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: 'FAILED',
          updatedAt: new Date()
        }
      });

      await prisma.paymentLog.create({
        data: {
          orderId: orderId,
          paymentId: `failed_${Date.now()}`,
          amount: updatedOrder.totalAmount,
          currency: 'INR',
          status: 'FAILED',
          gateway: 'RAZORPAY',
          errorMessage: errorMessage,
          createdAt: new Date()
        }
      });

      logger.info('Payment marked as failed', { orderId, errorMessage });
      
      return updatedOrder;
    } catch (error) {
      logger.error('Failed to update payment status', { orderId, error: error.message });
      throw error;
    }
  }

  async processRefund(orderId, amount, reason = 'Customer request') {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId }
      });

      if (!order || !order.razorpayPaymentId) {
        throw new Error('Order or payment not found');
      }

      if (order.paymentStatus !== 'SUCCEEDED') {
        throw new Error('Cannot refund non-successful payment');
      }

      const refund = await razorpayService.refundPayment(
        order.razorpayPaymentId,
        amount || order.totalAmount
      );

      // Update order status and create refund record
      await prisma.$transaction([
        prisma.order.update({
          where: { id: orderId },
          data: {
            paymentStatus: 'REFUNDED',
            updatedAt: new Date()
          }
        }),
        prisma.refund.create({
          data: {
            orderId: orderId,
            refundId: refund.id,
            amount: amount || order.totalAmount,
            status: 'PROCESSED',
            reason: reason,
            processedAt: new Date(),
            createdAt: new Date()
          }
        }),
        prisma.paymentLog.create({
          data: {
            orderId: orderId,
            paymentId: refund.id,
            amount: amount || order.totalAmount,
            currency: 'INR',
            status: 'REFUNDED',
            gateway: 'RAZORPAY',
            rawResponse: JSON.stringify(refund),
            createdAt: new Date()
          }
        })
      ]);

      logger.info('Refund processed successfully', { orderId, refundId: refund.id });

      return refund;
    } catch (error) {
      logger.error('Refund processing failed', { orderId, error: error.message });
      throw error;
    }
  }

  async getPaymentStatus(orderId) {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          paymentLogs: {
            orderBy: { createdAt: 'desc' },
            take: 1
          },
          refunds: {
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      if (!order) {
        throw new Error('Order not found');
      }

      return {
        orderId: order.id,
        paymentStatus: order.paymentStatus,
        razorpayOrderId: order.razorpayOrderId,
        razorpayPaymentId: order.razorpayPaymentId,
        totalAmount: order.totalAmount,
        latestPaymentLog: order.paymentLogs[0] || null,
        refunds: order.refunds
      };
    } catch (error) {
      logger.error('Get payment status failed', { orderId, error: error.message });
      throw error;
    }
  }
}

export default new PaymentService();