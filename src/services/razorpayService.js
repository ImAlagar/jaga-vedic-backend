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
      console.log('🔄 Attempting Razorpay refund:', { 
        paymentId, 
        amount,
        environment: process.env.RAZORPAY_KEY_ID?.includes('test') ? 'TEST' : 'LIVE'
      });
      
      // Validate inputs
      if (!paymentId) {
        throw new Error('Payment ID is required for refund');
      }
      
      if (!amount || amount <= 0) {
        throw new Error(`Invalid refund amount: ${amount}`);
      }

      const refundData = {
        payment_id: paymentId,
        amount: Math.round(amount * 100), // Convert to paise
        speed: 'normal'
      };

      console.log('📦 Razorpay refund payload:', refundData);

      const refund = await this.instance.payments.refund(refundData);
      
      console.log('✅ Razorpay refund response:', refund);
      
      logger.info('Payment refund processed', { 
        paymentId, 
        refundId: refund.id,
        amount: refund.amount / 100
      });
      
      return refund;
    } catch (error) {
      console.error('❌ Razorpay refund error details:', {
        paymentId,
        amount,
        errorMessage: error.message,
        errorCode: error.code,
        errorDescription: error.description,
        statusCode: error.statusCode,
        razorpayError: error.error,
        fullError: error
      });
      
      // Handle 404 specifically
      if (error.statusCode === 404) {
        throw new Error(`Payment ID '${paymentId}' not found in Razorpay. This payment may not exist or was not processed.`);
      }
      
      // Handle other errors
      let errorMsg = `Refund failed: ${error.message || 'Unknown error'}`;
      
      if (error.code === 'BAD_REQUEST_ERROR') {
        errorMsg = `Invalid refund request: ${error.description}`;
      } else if (error.code === 'GATEWAY_ERROR') {
        errorMsg = `Payment gateway error: ${error.description}`;
      } else if (error.statusCode === 401) {
        errorMsg = `Authentication failed. Check your Razorpay credentials.`;
      }
      
      throw new Error(errorMsg);
    }
  }


}

export default new RazorpayService();