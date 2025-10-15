// src/controllers/shippingController.js
import { printifyShippingService } from '../services/printifyShippingService.js';
import { successResponse, errorResponse } from '../utils/responseHandler.js';
import HttpStatus from '../constants/httpStatusCode.js';
import prisma from '../config/prisma.js';

export const shippingController = {
  /**
   * MAIN ENDPOINT: Get shipping estimates with free shipping logic
   */
  async getShippingEstimates(req, res) {
    try {
      const { cartItems, subtotal, country = 'US', region = null } = req.body;

      // Validation
      if (!cartItems || !Array.isArray(cartItems)) {
        return errorResponse(res, 'cartItems array is required', HttpStatus.BAD_REQUEST);
      }

      if (subtotal === undefined || subtotal === null) {
        return errorResponse(res, 'subtotal is required', HttpStatus.BAD_REQUEST);
      }

      // Validate cart items structure
      const validatedItems = cartItems.map((item, index) => {
        if (!item.productId || !item.variantId) {
          throw new Error(`Item ${index} missing productId or variantId`);
        }

        const variantId = parseInt(item.variantId);
        if (isNaN(variantId)) {
          throw new Error(`Invalid variantId: ${item.variantId} for item ${index}`);
        }

        return {
          ...item,
          variantId: variantId,
          productId: parseInt(item.productId),
          quantity: item.quantity || 1,
          price: item.price || 0
        };
      });

      // Calculate shipping
      const shippingData = await printifyShippingService.calculateCartShipping(
        validatedItems,
        country,
        region
      );

      return successResponse(res, shippingData, 'Shipping estimates calculated successfully');

    } catch (error) {
      console.error('❌ Shipping estimates error:', error);
      return errorResponse(res, error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  },

  /**
   * Test Printify API connection
   */
  async testConnection(req, res) {
    try {
      const connectionTest = await printifyShippingService.testConnection();
      return successResponse(res, connectionTest, 'Printify connection test completed');
    } catch (error) {
      console.error('❌ Printify connection test failed:', error);
      return errorResponse(res, error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  },

  /**
   * Get product variants from Printify
   */
  async getProductVariants(req, res) {
    try {
      const { productId } = req.params;
      
      if (!productId) {
        return errorResponse(res, 'productId is required', HttpStatus.BAD_REQUEST);
      }

      const variants = await printifyShippingService.getProductVariants(parseInt(productId));
      return successResponse(res, variants, 'Product variants retrieved successfully');

    } catch (error) {
      console.error('❌ Get product variants error:', error);
      return errorResponse(res, error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  },

  /**
   * Calculate Printify shipping (direct API call)
   */
  async calculatePrintifyShipping(req, res) {
    try {
      const { cartItems, shippingAddress } = req.body;

      if (!cartItems || !Array.isArray(cartItems) || !shippingAddress) {
        return errorResponse(res, 'cartItems and shippingAddress are required', HttpStatus.BAD_REQUEST);
      }

      const subtotal = cartItems.reduce((sum, item) => 
        sum + (item.price || 0) * (item.quantity || 1), 0
      );

      const validatedItems = cartItems.map(item => ({
        productId: item.productId || item.id,
        variantId: parseInt(item.variantId || item.printifyVariantId),
        quantity: item.quantity || 1,
        price: item.price || 0,
        name: item.name
      }));

      const shipping = await printifyShippingService.calculateCartShipping(
        validatedItems,
        shippingAddress.country,
        shippingAddress.region
      );

      return successResponse(res, shipping, 'Printify shipping calculated successfully');
    } catch (error) {
      console.error('❌ Printify shipping calculation error:', error);
      return errorResponse(res, error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  },

  /**
   * Get shipping for single product
   */
  async getProductShipping(req, res) {
    try {
      const { productId, variantId, country = 'US', region = null } = req.body;

      if (!productId || !variantId) {
        return errorResponse(res, 'productId and variantId are required', HttpStatus.BAD_REQUEST);
      }

      const numericVariantId = parseInt(variantId);
      if (isNaN(numericVariantId)) {
        return errorResponse(res, 'variantId must be a valid number', HttpStatus.BAD_REQUEST);
      }

      const shipping = await printifyShippingService.getShippingCost(
        parseInt(productId),
        numericVariantId,
        country,
        region
      );

      return successResponse(res, shipping, 'Product shipping calculated successfully');
    } catch (error) {
      console.error('❌ Product shipping error:', error);
      return errorResponse(res, error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  },

  /**
   * Test endpoint for debugging
   */
  async testShipping(req, res) {
    try {
      const testCart = [
        {
          productId: 68,
          variantId: 77016,
          quantity: 1,
          price: 30.00,
          name: "Test Product"
        }
      ];

      const result = await printifyShippingService.calculateCartShipping(testCart, 'US', null);
      
      return successResponse(res, {
        testData: testCart,
        shippingResult: result,
        message: 'Shipping test completed'
      }, 'Test completed successfully');

    } catch (error) {
      console.error('❌ Shipping test error:', error);
      return errorResponse(res, error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  },

  /**
   * Get supported countries
   */
  async getSupportedCountries(req, res) {
    try {
      const countries = [
        { code: 'US', name: 'United States', domestic: true, currency: 'USD', freeShipping: true },
        { code: 'CA', name: 'Canada', domestic: false, currency: 'CAD', freeShipping: true },
        { code: 'UK', name: 'United Kingdom', domestic: false, currency: 'GBP', freeShipping: true },
        { code: 'AU', name: 'Australia', domestic: false, currency: 'AUD', freeShipping: true },
        { code: 'DE', name: 'Germany', domestic: false, currency: 'EUR', freeShipping: true },
        { code: 'FR', name: 'France', domestic: false, currency: 'EUR', freeShipping: true },
        { code: 'IT', name: 'Italy', domestic: false, currency: 'EUR', freeShipping: true },
        { code: 'ES', name: 'Spain', domestic: false, currency: 'EUR', freeShipping: true },
        { code: 'JP', name: 'Japan', domestic: false, currency: 'JPY', freeShipping: false },
        { code: 'IN', name: 'India', domestic: false, currency: 'INR', freeShipping: false },
        { code: 'SG', name: 'Singapore', domestic: false, currency: 'SGD', freeShipping: true },
        { code: 'BR', name: 'Brazil', domestic: false, currency: 'BRL', freeShipping: false },
        { code: 'MX', name: 'Mexico', domestic: false, currency: 'MXN', freeShipping: false },
        { code: 'ZA', name: 'South Africa', domestic: false, currency: 'ZAR', freeShipping: false }
      ];

      return successResponse(res, countries, 'Supported countries retrieved successfully');
    } catch (error) {
      console.error('❌ Get countries error:', error);
      return errorResponse(res, error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  },

  /**
   * Get order shipping details
   */
  async getOrderShipping(req, res) {
    try {
      const { orderId } = req.params;
      const userId = req.user?.id;
      const userRole = req.user?.role;

      const order = await prisma.order.findFirst({
        where: { 
          id: parseInt(orderId),
          ...(userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN' && { userId })
        }
      });

      if (!order) {
        return errorResponse(res, 'Order not found or access denied', HttpStatus.NOT_FOUND);
      }

      const shipping = await printifyShippingService.getOrderShipping(parseInt(orderId));

      if (!shipping) {
        return errorResponse(res, 'Shipping information not found for this order', HttpStatus.NOT_FOUND);
      }

      return successResponse(res, shipping, 'Shipping details retrieved successfully');
    } catch (error) {
      console.error('❌ Get order shipping error:', error);
      return errorResponse(res, error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  },

  /**
   * Update order tracking (Admin only)
   */
  async updateOrderTracking(req, res) {
    try {
      const { orderId } = req.params;
      const trackingData = req.body;

      if (!trackingData.trackingNumber) {
        return errorResponse(res, 'trackingNumber is required', HttpStatus.BAD_REQUEST);
      }

      await printifyShippingService.updateShippingTracking(parseInt(orderId), trackingData);

      return successResponse(res, null, 'Tracking information updated successfully');
    } catch (error) {
      console.error('❌ Update order tracking error:', error);
      return errorResponse(res, error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  },

  // Add this to your shippingController.js
async debugProducts(req, res) {
  try {
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        printifyProductId: true,
        inStock: true,
        isPublished: true
      },
      take: 10
    });

    return successResponse(res, {
      totalProducts: products.length,
      products: products
    }, 'Products retrieved successfully');

  } catch (error) {
    console.error('❌ Debug products error:', error);
    return errorResponse(res, error.message, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
};