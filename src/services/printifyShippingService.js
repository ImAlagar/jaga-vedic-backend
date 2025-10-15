// src/services/printifyShippingService.js
import axios from 'axios';
import prisma from '../config/prisma.js'; // ✅ Add .js extension

class PrintifyShippingService {
  constructor() {
    this.apiBase = 'https://api.printify.com/v1';
    this.shopId = process.env.PRINTIFY_SHOP_ID;
    this.apiToken = process.env.PRINTIFY_API_KEY;
    this.freeShippingThreshold = 50; // $50 for free shipping
    
  }

  /**
   * Test Printify API connection
   */
  async testConnection() {
    try {
      
      if (!this.shopId || !this.apiToken) {
        throw new Error('Missing PRINTIFY_SHOP_ID or PRINTIFY_API_TOKEN environment variables');
      }

      const response = await axios.get(
        `${this.apiBase}/shops/${this.shopId}/products.json`,
        {
          headers: this.getHeaders(),
          timeout: 10000
        }
      );

      return {
        success: true,
        shopId: this.shopId,
        productsCount: response.data?.length || 0,
        message: 'Successfully connected to Printify API'
      };
    } catch (error) {
      console.error('❌ Printify API connection failed:');
      
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Data:', error.response.data);
        
        if (error.response.status === 401) {
          throw new Error('Printify API: 401 Unauthorized - Invalid API token or shop ID');
        } else if (error.response.status === 404) {
          throw new Error('Printify API: 404 Not Found - Shop not found');
        }
      }
      
      throw new Error(`Printify API connection failed: ${error.message}`);
    }
  }

  /**
   * Get request headers
   */
  getHeaders() {
    return {
      'Authorization': `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json',
      'User-Agent': 'AgumiyaCollections/1.0'
    };
  }

  /**
   * MAIN METHOD: Calculate shipping for cart with free shipping logic
   */
  async calculateCartShipping(cartItems, country = 'US', region = null) {
    try {

      if (!cartItems || cartItems.length === 0) {
        return this.getEmptyCartResponse();
      }

      // Calculate subtotal
      const subtotal = this.calculateSubtotal(cartItems);
      const isFreeShipping = subtotal >= this.freeShippingThreshold;


      // Get actual shipping costs from Printify
      let shippingData;
      try {
        shippingData = await this.getPrintifyShippingCosts(cartItems, country, region);
      } catch (printifyError) {
        console.warn('⚠️ Printify API failed, using fallback:', printifyError.message);
        shippingData = this.getFallbackShippingCosts(cartItems, country);
      }

      // Apply free shipping logic
      const finalShippingCost = isFreeShipping ? 0 : shippingData.totalShipping;

      const response = {
        totalShipping: finalShippingCost,
        originalShipping: shippingData.totalShipping,
        isFree: isFreeShipping,
        freeShippingThreshold: this.freeShippingThreshold,
        amountNeeded: Math.max(0, this.freeShippingThreshold - subtotal),
        progress: Math.min(100, (subtotal / this.freeShippingThreshold) * 100),
        subtotal: subtotal,
        items: shippingData.items,
        currency: 'USD',
        isAvailable: true,
        estimatedDays: shippingData.estimatedDays,
        message: this.getShippingMessage(isFreeShipping, subtotal),
        hasFallback: shippingData.hasFallback || false
      };

      return response;

    } catch (error) {
      console.error('❌ Cart shipping calculation error:', error);
      return this.getEmergencyFallback(cartItems, country);
    }
  }

  /**
   * Get shipping costs from Printify API
   */
  async getPrintifyShippingCosts(cartItems, country, region) {
    const shippingPromises = cartItems.map(async (item) => {
      try {
        const variantId = parseInt(item.variantId);
        if (isNaN(variantId)) {
          throw new Error(`Invalid variantId: ${item.variantId}`);
        }

        const shipping = await this.getShippingCost(
          item.productId,
          variantId,
          country,
          region
        );

        return {
          ...shipping,
          productId: item.productId,
          variantId: variantId,
          quantity: item.quantity || 1,
          itemShipping: shipping.shippingCost * (item.quantity || 1),
          productName: item.name || `Product ${item.productId}`
        };
      } catch (error) {
        console.error(`❌ Failed to get shipping for product ${item.productId}:`, error.message);
        return this.getFallbackItemShipping(item, country);
      }
    });

    const shippingResults = await Promise.all(shippingPromises);
    
    const totalShipping = shippingResults.reduce((total, item) => total + item.itemShipping, 0);
    const hasFallback = shippingResults.some(item => item.isFallback);

    const estimatedDays = shippingResults[0]?.estimatedDays || { min: 7, max: 14 };

    return {
      totalShipping,
      items: shippingResults,
      estimatedDays,
      hasFallback
    };
  }

  /**
   * Get shipping cost for single product variant
   */
  async getShippingCost(productId, variantId, country = 'US', region = null) {
    try {

      // Validate inputs
      if (!productId || !variantId) {
        throw new Error('productId and variantId are required');
      }

      const numericVariantId = parseInt(variantId);
      if (isNaN(numericVariantId)) {
        throw new Error(`Invalid variantId: ${variantId}`);
      }

      // Check cache first
      const cached = await this.getCachedShipping(productId, numericVariantId, country, region);
      if (cached) {
        return cached;
      }

      // Get product details from database
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { 
          id: true,
          printifyProductId: true,
          name: true 
        }
      });

      if (!product) {
        throw new Error(`Product ${productId} not found in database`);
      }

      if (!product.printifyProductId) {
        throw new Error(`Product ${productId} not synced with Printify`);
      }

      // Call Printify API
      const shippingData = await this.callPrintifyShippingAPI(
        product.printifyProductId,
        numericVariantId,
        country,
        region
      );

      // Cache the result
      await this.cacheShipping(
        productId,
        numericVariantId,
        country,
        region,
        shippingData
      );

      return shippingData;

    } catch (error) {
      console.error('❌ Printify shipping error:', error.message);
      return this.getFallbackShipping(country);
    }
  }

  /**
   * Call Printify Shipping API
   */
  async callPrintifyShippingAPI(printifyProductId, variantId, country, region) {
    try {
      // First test if we can connect to Printify
      await this.testConnection();

      const addressTo = {
        country: country,
        ...(region && { region: region })
      };

      const requestBody = {
        line_items: [
          {
            product_id: printifyProductId,
            variant_id: variantId,
            quantity: 1
          }
        ],
        address_to: addressTo
      };

      
      const response = await axios.post(
        `${this.apiBase}/shops/${this.shopId}/orders/shipping.json`,
        requestBody,
        {
          headers: this.getHeaders(),
          timeout: 15000
        }
      );


      return this.parseShippingResponse(response.data, country);

    } catch (error) {
      console.error('❌ Printify API call failed:');
      
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Data:', error.response.data);
        
        if (error.response.status === 401) {
          throw new Error('Printify API: 401 Unauthorized - Invalid API token or shop ID');
        } else if (error.response.status === 404) {
          throw new Error(`Printify API: 404 Not Found - Product ${printifyProductId} or variant ${variantId} not found`);
        } else if (error.response.status === 400) {
          throw new Error(`Printify API: Bad Request - ${JSON.stringify(error.response.data)}`);
        } else {
          throw new Error(`Printify API Error ${error.response.status}: ${JSON.stringify(error.response.data)}`);
        }
      } else if (error.request) {
        console.error('No response received from Printify API');
        throw new Error('Printify API: No response received - Check your internet connection');
      } else {
        console.error('Error:', error.message);
        throw new Error(`Printify API: ${error.message}`);
      }
    }
  }

  /**
   * Parse Printify shipping response
   */
  parseShippingResponse(data, country) {
    try {
      const shippingMethods = Object.entries(data);
      
      if (shippingMethods.length === 0) {
        throw new Error('No shipping methods available from Printify');
      }

      // Get the cheapest shipping method
      const [methodName, cost] = shippingMethods.reduce((cheapest, [name, price]) => {
        return price < cheapest[1] ? [name, price] : cheapest;
      }, [null, Infinity]);

      if (cost === Infinity) {
        throw new Error('No valid shipping costs found');
      }

      const result = {
        shippingCost: cost / 100, // Convert cents to dollars
        shippingMethod: cost,
        methodName: methodName || 'standard',
        estimatedDays: this.getEstimatedDays(country, methodName),
        currency: 'USD',
        isAvailable: true,
        isFallback: false
      };

      return result;

    } catch (error) {
      throw new Error('Invalid shipping response from Printify');
    }
  }

  /**
   * Get product variants from Printify
   */
  async getProductVariants(productId) {
    try {
      
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { printifyProductId: true, printifyVariants: true }
      });

      if (!product) {
        throw new Error('Product not found in database');
      }

      if (!product.printifyProductId) {
        throw new Error('Product not synced with Printify');
      }

      // Test connection first
      await this.testConnection();

      // Fetch variants from Printify API
      const response = await axios.get(
        `${this.apiBase}/shops/${this.shopId}/products/${product.printifyProductId}.json`,
        {
          headers: this.getHeaders(),
          timeout: 10000
        }
      );

      return {
        productId: productId,
        printifyProductId: product.printifyProductId,
        variants: response.data.variants || []
      };

    } catch (error) {
      console.error('❌ Failed to get product variants:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get cached shipping data
   */
  async getCachedShipping(productId, variantId, country, region) {
    try {
      const cache = await prisma.printifyShippingCache.findUnique({
        where: {
          productId_variantId_country_region: {
            productId: parseInt(productId),
            variantId: parseInt(variantId),
            country: country,
            region: region || ''
          }
        }
      });

      if (cache && cache.expiresAt > new Date() && cache.isAvailable) {
        return {
          shippingCost: cache.shippingCost,
          shippingMethod: cache.shippingMethod,
          estimatedDays: cache.estimatedDays || { min: 7, max: 14 },
          methodName: 'standard',
          currency: 'USD',
          cached: true,
          isAvailable: true,
          isFallback: false
        };
      }

      return null;
    } catch (error) {
      console.error('❌ Cache lookup error:', error);
      return null;
    }
  }

  /**
   * Cache shipping data
   */
  async cacheShipping(productId, variantId, country, region, shippingData) {
    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // Cache for 24 hours

      await prisma.printifyShippingCache.upsert({
        where: {
          productId_variantId_country_region: {
            productId: parseInt(productId),
            variantId: parseInt(variantId),
            country: country,
            region: region || ''
          }
        },
        update: {
          shippingCost: shippingData.shippingCost,
          shippingMethod: shippingData.shippingMethod,
          estimatedDays: shippingData.estimatedDays,
          expiresAt,
          isAvailable: true
        },
        create: {
          productId: parseInt(productId),
          variantId: parseInt(variantId),
          country: country,
          region: region || '',
          shippingCost: shippingData.shippingCost,
          shippingMethod: shippingData.shippingMethod,
          estimatedDays: shippingData.estimatedDays,
          expiresAt,
          isAvailable: true
        }
      });

    } catch (error) {
      console.error('❌ Cache storage error:', error);
    }
  }

  /**
   * Fallback shipping calculation methods
   */
  getFallbackShippingCosts(cartItems, country) {
    
    const items = cartItems.map(item => this.getFallbackItemShipping(item, country));
    const totalShipping = items.reduce((total, item) => total + item.itemShipping, 0);

    return {
      totalShipping,
      items,
      estimatedDays: this.getEstimatedDays(country, 'standard'),
      hasFallback: true
    };
  }

  getFallbackItemShipping(item, country) {
    const baseRate = this.getFallbackShipping(country).shippingCost;
    const itemShipping = baseRate * (item.quantity || 1);

    return {
      productId: item.productId,
      variantId: parseInt(item.variantId),
      quantity: item.quantity || 1,
      shippingCost: baseRate,
      itemShipping: itemShipping,
      estimatedDays: this.getEstimatedDays(country, 'standard'),
      methodName: 'standard',
      isFallback: true,
      isAvailable: true,
      productName: item.name || `Product ${item.productId}`
    };
  }

  getFallbackShipping(country) {
    const fallbackRates = {
      'US': 5.99,
      'CA': 12.99,
      'UK': 14.99,
      'EU': 13.99,
      'AU': 18.99,
      'IN': 8.99,
      'default': 15.99
    };

    return {
      shippingCost: fallbackRates[country] || fallbackRates.default,
      shippingMethod: 1,
      estimatedDays: this.getEstimatedDays(country, 'standard'),
      methodName: 'standard',
      currency: 'USD',
      isFallback: true,
      isAvailable: true
    };
  }

  getEmergencyFallback(cartItems, country) {
    const subtotal = this.calculateSubtotal(cartItems);
    const isFree = subtotal >= this.freeShippingThreshold;

    return {
      totalShipping: isFree ? 0 : 9.99,
      originalShipping: 9.99,
      isFree: isFree,
      freeShippingThreshold: this.freeShippingThreshold,
      amountNeeded: Math.max(0, this.freeShippingThreshold - subtotal),
      progress: Math.min(100, (subtotal / this.freeShippingThreshold) * 100),
      subtotal: subtotal,
      items: cartItems.map(item => ({
        productId: item.productId,
        variantId: parseInt(item.variantId),
        quantity: item.quantity || 1,
        shippingCost: 9.99 / cartItems.length,
        itemShipping: (9.99 / cartItems.length) * (item.quantity || 1),
        isFallback: true,
        isAvailable: true
      })),
      currency: 'USD',
      isAvailable: true,
      estimatedDays: { min: 10, max: 21 },
      message: this.getShippingMessage(isFree, subtotal),
      hasFallback: true,
      isEmergency: true
    };
  }

  /**
   * Helper methods
   */
  calculateSubtotal(cartItems) {
    return cartItems.reduce((sum, item) => {
      return sum + (item.price || 0) * (item.quantity || 1);
    }, 0);
  }

  getShippingMessage(isFree, subtotal) {
    if (isFree) {
      return '🎉 You got free shipping!';
    } else {
      const amountNeeded = this.freeShippingThreshold - subtotal;
      return `Add $${amountNeeded.toFixed(2)} more for free shipping!`;
    }
  }

  getEmptyCartResponse() {
    return {
      totalShipping: 0,
      originalShipping: 0,
      isFree: false,
      freeShippingThreshold: this.freeShippingThreshold,
      amountNeeded: this.freeShippingThreshold,
      progress: 0,
      subtotal: 0,
      items: [],
      currency: 'USD',
      isAvailable: true,
      estimatedDays: { min: 3, max: 7 },
      message: 'Add items to calculate shipping',
      hasFallback: false
    };
  }

  getEstimatedDays(country, methodName) {
    const estimates = {
      'US': { standard: { min: 3, max: 7 }, express: { min: 1, max: 3 } },
      'CA': { standard: { min: 5, max: 10 }, express: { min: 2, max: 5 } },
      'UK': { standard: { min: 7, max: 14 }, express: { min: 3, max: 7 } },
      'EU': { standard: { min: 7, max: 14 }, express: { min: 3, max: 7 } },
      'AU': { standard: { min: 10, max: 18 }, express: { min: 5, max: 10 } },
      'IN': { standard: { min: 5, max: 10 }, express: { min: 2, max: 5 } },
      'default': { standard: { min: 10, max: 21 }, express: { min: 5, max: 12 } }
    };

    const countryEstimate = estimates[country] || estimates.default;
    return countryEstimate[methodName] || countryEstimate.standard;
  }
}

export const printifyShippingService = new PrintifyShippingService();
export default printifyShippingService;