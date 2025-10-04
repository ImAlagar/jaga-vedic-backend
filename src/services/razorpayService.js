import Razorpay from 'razorpay';
import logger from '../utils/logger.js';

class RazorpayService {
  constructor() {
    this.instance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }

  async createOrder(orderData) {
    try {
      const { amount, currency = 'INR', receipt, notes = {} } = orderData;
      
      const options = {
        amount: Math.round(amount * 100), // Convert to paise
        currency,
        receipt: receipt || `receipt_${Date.now()}`,
        notes,
        payment_capture: 1 // Auto capture payment
      };

      logger.info('Creating Razorpay order', { options });
      
      const razorpayOrder = await this.instance.orders.create(options);
      
      logger.info('Razorpay order created successfully', { 
        orderId: razorpayOrder.id,
        amount: razorpayOrder.amount
      });
      
      return {
        success: true,
        order: razorpayOrder,
        key: process.env.RAZORPAY_KEY_ID
      };
    } catch (error) {
      logger.error('Razorpay order creation failed', { error: error.message });
      throw new Error(`Payment initiation failed: ${error.message}`);
    }
  }

  async verifyPaymentSignature(paymentData) {
    try {
      const crypto = await import('crypto');
      
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(paymentData.razorpay_order_id + "|" + paymentData.razorpay_payment_id)
        .digest('hex');

      const isValid = expectedSignature === paymentData.razorpay_signature;
      
      logger.info('Payment signature verification', { 
        isValid,
        orderId: paymentData.razorpay_order_id 
      });
      
      return isValid;
    } catch (error) {
      logger.error('Payment verification failed', { error: error.message });
      return false;
    }
  }

  async fetchPayment(paymentId) {
    try {
      const payment = await this.instance.payments.fetch(paymentId);
      return payment;
    } catch (error) {
      logger.error('Fetch payment failed', { paymentId, error: error.message });
      throw new Error(`Payment fetch failed: ${error.message}`);
    }
  }

  async refundPayment(paymentId, amount) {
    try {
      const refundData = {
        payment_id: paymentId,
        amount: Math.round(amount * 100), // Convert to paise
        speed: 'normal'
      };

      const refund = await this.instance.payments.refund(refundData);
      
      logger.info('Payment refund processed', { 
        paymentId, 
        refundId: refund.id,
        amount: refund.amount / 100
      });
      
      return refund;
    } catch (error) {
      logger.error('Payment refund failed', { paymentId, error: error.message });
      throw new Error(`Refund failed: ${error.message}`);
    }
  }
}

export default new RazorpayService();