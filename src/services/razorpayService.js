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


    // ADD THESE MISSING METHODS:
  async verifyPayment(paymentId) {
    try {
      console.log('🔍 Verifying payment existence:', paymentId);
      const payment = await this.instance.payments.fetch(paymentId);
      const exists = payment && payment.status === 'captured';
      console.log('✅ Payment verification result:', { 
        exists, 
        status: payment?.status,
        amount: payment?.amount 
      });
      return exists;
    } catch (error) {
      console.error('❌ Payment verification failed:', {
        paymentId,
        error: error.message,
        statusCode: error.statusCode
      });
      return false;
    }
  }

  async getPayment(paymentId) {
    try {
      console.log('📋 Fetching payment details:', paymentId);
      const payment = await this.instance.payments.fetch(paymentId);
      console.log('✅ Payment details fetched:', { 
        id: payment.id, 
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency
      });
      return payment;
    } catch (error) {
      console.error('❌ Failed to fetch payment:', {
        paymentId,
        error: error.message,
        statusCode: error.statusCode
      });
      throw new Error(`Payment ${paymentId} not found: ${error.message}`);
    }
  }

  // FIX THE REFUND METHOD - Add missing await
  async refundPayment(paymentId, amount, retries = 3) {
    try {
      // Validate inputs
      if (!paymentId) {
        throw new Error('Payment ID is required for refund');
      }
      
      if (!amount || amount <= 0) {
        throw new Error(`Invalid refund amount: ${amount}`);
      }

      // Step 1: First verify the payment exists and is refundable
      let payment;
      try {
        payment = await this.instance.payments.fetch(paymentId);
      } catch (fetchError) {
        console.error('❌ Payment fetch failed:', {
          paymentId,
          statusCode: fetchError.statusCode,
          error: fetchError.message,
          razorpayError: fetchError.error
        });
        
        if (fetchError.statusCode === 404) {
          throw new Error(`Payment ID '${paymentId}' not found in Razorpay. This payment may not have been completed or doesn't exist.`);
        }
        throw fetchError;
      }

      // Step 2: Validate payment status
      if (payment.status !== 'captured') {
        throw new Error(`Payment not eligible for refund. Current status: ${payment.status}. Only 'captured' payments can be refunded.`);
      }

      // Step 3: Check if payment is already refunded
      if (payment.refund_status === 'full' || payment.refund_status === 'partial') {
        const alreadyRefunded = payment.amount_refunded || 0;
        const remainingAmount = payment.amount - alreadyRefunded;
        
        if (amount * 100 > remainingAmount) {
          throw new Error(`Refund amount (₹${amount}) exceeds remaining refundable amount (₹${remainingAmount / 100})`);
        }
      }

      // Step 4: Prepare refund data
      const refundData = {
        payment_id: paymentId,
        amount: Math.round(amount * 100), // Convert to paise
        speed: 'normal',
        notes: {
          reason: 'order_cancellation',
          cancelled_at: new Date().toISOString()
        }
      };

      // Step 5: Process refund with enhanced error handling
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          console.log(`🔄 Refund attempt ${attempt} for payment:`, paymentId);
          
          // ✅ FIX: Add await here
          const refund = await this.instance.payments.refund(refundData);
          
          logger.info('Payment refund processed', { 
            paymentId, 
            refundId: refund.id,
            amount: refund.amount / 100,
            status: refund.status
          });
          
          return refund;
          
        } catch (retryError) {
          console.error(`❌ Refund attempt ${attempt} failed:`, {
            paymentId,
            error: retryError.message,
            statusCode: retryError.statusCode
          });

          if (retryError.statusCode === 404) {
            const isTestPayment = paymentId.startsWith('pay_') && !paymentId.includes('live');
            throw new Error(`Payment ID '${paymentId}' cannot be refunded. Environment mismatch or payment not fully processed.`);
          }
          
          if (attempt === retries) {
            throw retryError;
          }
          
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      
    } catch (error) {
      console.error('❌ Razorpay refund final error:', {
        paymentId,
        amount,
        errorMessage: error.message,
        statusCode: error.statusCode
      });
      
      if (error.statusCode === 404) {
        throw new Error(`Payment ID '${paymentId}' not found for refund.`);
      } else if (error.code === 'BAD_REQUEST_ERROR') {
        throw new Error(`Invalid refund request: ${error.description || error.message}`);
      } else if (error.code === 'GATEWAY_ERROR') {
        throw new Error(`Payment gateway error: ${error.description || error.message}`);
      } else if (error.statusCode === 401) {
        throw new Error(`Authentication failed. Check your Razorpay credentials.`);
      }
      
      throw new Error(`Refund failed: ${error.message || 'Unknown error'}`);
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

// In src/services/razorpayService.js
async refundPayment(paymentId, amount, retries = 3) {
  try {
    
    // Validate inputs
    if (!paymentId) {
      throw new Error('Payment ID is required for refund');
    }
    
    if (!amount || amount <= 0) {
      throw new Error(`Invalid refund amount: ${amount}`);
    }

    // Step 1: First verify the payment exists and is refundable
    let payment;
    try {
      payment = await this.instance.payments.fetch(paymentId);

    } catch (fetchError) {
      console.error('❌ Payment fetch failed:', {
        paymentId,
        statusCode: fetchError.statusCode,
        error: fetchError.message,
        razorpayError: fetchError.error
      });
      
      if (fetchError.statusCode === 404) {
        throw new Error(`Payment ID '${paymentId}' not found in Razorpay. This payment may not have been completed or doesn't exist.`);
      }
      throw fetchError;
    }

    // Step 2: Validate payment status
    if (payment.status !== 'captured') {
      throw new Error(`Payment not eligible for refund. Current status: ${payment.status}. Only 'captured' payments can be refunded.`);
    }

    // Step 3: Check if payment is already refunded
    if (payment.refund_status === 'full' || payment.refund_status === 'partial') {
      // Check if we can process additional refund
      const alreadyRefunded = payment.amount_refunded || 0;
      const remainingAmount = payment.amount - alreadyRefunded;
      
      if (amount * 100 > remainingAmount) {
        throw new Error(`Refund amount (₹${amount}) exceeds remaining refundable amount (₹${remainingAmount / 100})`);
      }
    }

    // Step 4: Prepare refund data
    const refundData = {
      payment_id: paymentId,
      amount: Math.round(amount * 100), // Convert to paise
      speed: 'normal',
      notes: {
        reason: 'order_cancellation',
        cancelled_at: new Date().toISOString()
      }
    };


    // Step 5: Process refund with enhanced error handling
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        
        const refund = this.instance.payments.refund(refundData);
        
        logger.info('Payment refund processed', { 
          paymentId, 
          refundId: refund.id,
          amount: refund.amount / 100,
          status: refund.status
        });
        
        return refund;
        
      } catch (retryError) {

        
        // Enhanced error analysis
        if (retryError.statusCode === 404) {
          // This is the core issue - payment exists but refund returns 404
          
          // Check if this is a test payment in live mode or vice versa
          const isTestPayment = paymentId.startsWith('pay_') && !paymentId.includes('live');

          
          throw new Error(`Payment ID '${paymentId}' cannot be refunded. This may be due to environment mismatch (test payment in live mode) or payment not being fully processed.`);
        }
        
        // If this is the last attempt, throw the error
        if (attempt === retries) {
          throw retryError;
        }
        
        // Wait before retrying (exponential backoff)
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
  } catch (error) {
    console.error('❌ Razorpay refund final error:', {
      paymentId,
      amount,
      errorMessage: error.message,
      errorCode: error.code,
      errorDescription: error.description,
      statusCode: error.statusCode,
      razorpayError: error.error
    });
    
    // Handle specific error cases
    if (error.statusCode === 404) {
      throw new Error(`Payment ID '${paymentId}' not found for refund. This payment may exist but cannot be refunded due to environment mismatch or processing status.`);
    } else if (error.code === 'BAD_REQUEST_ERROR') {
      throw new Error(`Invalid refund request: ${error.description || error.message}`);
    } else if (error.code === 'GATEWAY_ERROR') {
      throw new Error(`Payment gateway error: ${error.description || error.message}`);
    } else if (error.statusCode === 401) {
      throw new Error(`Authentication failed. Check your Razorpay credentials.`);
    }
    
    throw new Error(`Refund failed: ${error.message || 'Unknown error'}`);
  }
}

}

export default new RazorpayService();