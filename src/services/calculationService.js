// src/services/calculationService.js
import { taxService } from './taxService.js';
import printifyShippingService from './printifyShippingService.js';
import { couponService } from './couponService.js';
import prisma from '../config/prisma.js';

export class CalculationService {
  /**
   * MAIN METHOD: Calculate complete order totals with real-time shipping, tax, and coupon
   */
  async calculateOrderTotals(cartItems, shippingAddress, couponCode = '', userId = null) {
    try {
      
      // Validate inputs
      if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
        throw new Error('Cart items are required');
      }

      if (!shippingAddress || !shippingAddress.country) {
        throw new Error('Shipping address with country is required');
      }

      // Step 1: Calculate subtotal
      const subtotal = this.calculateSubtotal(cartItems);

      // Step 2: Get real-time Printify shipping cost
      const shippingResult = await this.getRealTimeShipping(cartItems, shippingAddress);

      // Step 3: Calculate tax
      const taxResult = await this.calculateTaxAmount(cartItems, subtotal, shippingResult.totalShipping, shippingAddress);

      // Step 4: Validate and apply coupon
      const couponResult = await this.applyCoupon(cartItems, subtotal, couponCode, userId, shippingAddress.country);

      // Step 5: Calculate final totals
      const finalTotals = this.calculateFinalTotals(
        subtotal, 
        shippingResult.totalShipping, 
        taxResult.taxAmount, 
        couponResult.discountAmount
      );


      return {
        success: true,
        data: {
          ...finalTotals,
          breakdown: {
            subtotal: finalTotals.subtotal,
            shipping: finalTotals.shipping,
            tax: finalTotals.tax,
            taxRate: taxResult.taxRate,
            discount: finalTotals.discount,
            couponCode: couponResult.couponCode,
            couponMessage: couponResult.message,
            isFreeShipping: shippingResult.isFree,
            shippingMessage: shippingResult.message,
            currency: 'USD'
          },
          shippingDetails: {
            cost: finalTotals.shipping,
            isFree: shippingResult.isFree,
            originalCost: shippingResult.originalShipping,
            freeShippingThreshold: shippingResult.freeShippingThreshold,
            amountNeeded: shippingResult.amountNeeded,
            estimatedDays: shippingResult.estimatedDays,
            progress: shippingResult.progress
          },
          taxDetails: {
            rate: taxResult.taxRate,
            amount: finalTotals.tax,
            country: shippingAddress.country,
            appliesToShipping: taxResult.appliesToShipping
          },
          couponDetails: {
            code: couponResult.couponCode,
            discountAmount: finalTotals.discount,
            discountType: couponResult.discountType,
            message: couponResult.message,
            isValid: couponResult.isValid
          }
        }
      };

    } catch (error) {
      console.error('❌ Calculation error:', error);
      return {
        success: false,
        message: error.message,
        data: null
      };
    }
  }

  /**
   * Calculate subtotal from cart items
   */
  calculateSubtotal(cartItems) {
    return cartItems.reduce((total, item) => {
      const price = parseFloat(item.price) || 0;
      const quantity = parseInt(item.quantity) || 1;
      return total + (price * quantity);
    }, 0);
  }

  /**
   * Get real-time shipping cost from Printify
   */
  async getRealTimeShipping(cartItems, shippingAddress) {
    try {
      const validatedItems = cartItems.map(item => ({
        productId: parseInt(item.productId),
        variantId: parseInt(item.variantId),
        quantity: parseInt(item.quantity) || 1,
        price: parseFloat(item.price) || 0,
        name: item.name || `Product ${item.productId}`
      }));

      const shippingData = await printifyShippingService.calculateCartShipping(
        validatedItems,
        shippingAddress.country,
        shippingAddress.region || null
      );

      return {
        totalShipping: this.roundCurrency(shippingData.totalShipping || 0),
        originalShipping: this.roundCurrency(shippingData.originalShipping || shippingData.totalShipping || 0),
        isFree: shippingData.isFree || false,
        freeShippingThreshold: shippingData.freeShippingThreshold || 50,
        amountNeeded: this.roundCurrency(shippingData.amountNeeded || 0),
        progress: shippingData.progress || 0,
        estimatedDays: shippingData.estimatedDays || { min: 7, max: 14 },
        message: shippingData.message || 'Shipping calculated',
        items: shippingData.items || []
      };

    } catch (error) {
      console.error('❌ Shipping calculation failed, using fallback:', error);
      return this.getFallbackShipping(cartItems, shippingAddress.country);
    }
  }

  /**
   * Calculate tax amount
   */
  async calculateTaxAmount(cartItems, subtotal, shippingCost, shippingAddress) {
    try {
      const taxData = {
        items: cartItems.map(item => ({
          productId: parseInt(item.productId),
          price: parseFloat(item.price) || 0,
          quantity: parseInt(item.quantity) || 1
        })),
        shippingAddress: shippingAddress,
        subtotal: subtotal,
        shippingCost: shippingCost
      };

      const taxResult = await taxService.calculateTax(taxData);

      if (taxResult.success && taxResult.data) {
        return {
          taxAmount: this.roundCurrency(taxResult.data.taxAmount || 0),
          taxRate: taxResult.data.taxRate || 0,
          appliesToShipping: taxResult.data.appliesToShipping || false
        };
      } else {
        throw new Error(taxResult.message || 'Tax calculation failed');
      }

    } catch (error) {
      console.error('❌ Tax calculation failed, using fallback:', error);
      return this.getFallbackTax(subtotal, shippingAddress.country);
    }
  }

  /**
   * Apply coupon discount
   */
async applyCoupon(cartItems, subtotal, couponCode, userId, country) {
  try {
    if (!couponCode || couponCode.trim() === '') {
      return {
        discountAmount: 0,
        couponCode: null,
        message: 'No coupon applied',
        isValid: true,
        discountType: null
      };
    }

    // Get products for coupon validation
    const productIds = cartItems.map(item => parseInt(item.productId));
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } }
    });

    const validationItems = cartItems.map(item => {
      const product = products.find(p => p.id === parseInt(item.productId));
      return {
        productId: parseInt(item.productId),
        variantId: parseInt(item.variantId),
        quantity: parseInt(item.quantity) || 1,
        price: parseFloat(item.price) || 0,
        product: product
      };
    });

    const couponValidation = await couponService.validateCoupon(
      couponCode.trim(),
      userId,
      validationItems,
      subtotal,
      country
    );


    let finalDiscount = 0;
    let message = 'No coupon applied';
    
    if (couponValidation.isValid && couponValidation.coupon) {
      // 🔥 CORRECT: Get discount from coupon object
      finalDiscount = couponValidation.coupon.discountAmount || 0;
      message = finalDiscount > 0 ? 
        `Coupon applied successfully - $${finalDiscount} discount` : 
        'Coupon valid but no discount applicable';
    } else {
      message = couponValidation.error || 'Invalid coupon';
    }

    return {
      discountAmount: this.roundCurrency(finalDiscount),
      couponCode: couponValidation.coupon?.code || couponCode,
      message: message,
      isValid: couponValidation.isValid,
      discountType: couponValidation.coupon?.discountType
    };

  } catch (error) {
    console.error('❌ Coupon application failed:', error);
    return {
      discountAmount: 0,
      couponCode: couponCode,
      message: 'Coupon validation failed',
      isValid: false,
      discountType: null
    };
  }
}

  /**
   * Calculate final totals
   */
  calculateFinalTotals(subtotal, shipping, tax, discount) {
    // Calculate taxable amount (subtotal - discount)
    const taxableAmount = Math.max(0, subtotal - discount);
    
    // Final total = (Subtotal - Discount) + Shipping + Tax
    const finalTotal = taxableAmount + shipping + tax;

    return {
      subtotal: this.roundCurrency(subtotal),
      shipping: this.roundCurrency(shipping),
      tax: this.roundCurrency(tax),
      discount: this.roundCurrency(discount),
      finalTotal: this.roundCurrency(finalTotal),
      taxableAmount: this.roundCurrency(taxableAmount)
    };
  }

  /**
   * Round to 2 decimal places for currency - FIXED VERSION
   */
  roundCurrency(amount) {
    return Math.round((amount + Number.EPSILON) * 100) / 100;
  }

  /**
   * Fallback shipping calculation
   */
  getFallbackShipping(cartItems, country) {
    const subtotal = this.calculateSubtotal(cartItems);
    const isFree = subtotal >= 50;
    const baseShipping = this.getBaseShippingRate(country);
    const shippingCost = isFree ? 0 : baseShipping;

    return {
      totalShipping: this.roundCurrency(shippingCost),
      originalShipping: this.roundCurrency(baseShipping),
      isFree: isFree,
      freeShippingThreshold: 50,
      amountNeeded: this.roundCurrency(Math.max(0, 50 - subtotal)),
      progress: Math.min(100, (subtotal / 50) * 100),
      estimatedDays: { min: 7, max: 14 },
      message: isFree ? '🎉 Free shipping applied!' : `Add $${(50 - subtotal).toFixed(2)} for free shipping!`,
      items: []
    };
  }

  /**
   * Get base shipping rate by country
   */
  getBaseShippingRate(country) {
    const rates = {
      'US': 5.99, 'IN': 5.99, 'CA': 8.99, 'GB': 6.99, 'AU': 12.99,
      'DE': 7.99, 'FR': 7.99, 'IT': 7.99, 'ES': 7.99, 'JP': 9.99,
      'default': 9.99
    };
    return rates[country] || rates.default;
  }

  /**
   * Fallback tax calculation
   */
  getFallbackTax(subtotal, country) {
    const taxRates = {
      'US': 0.085, 'IN': 0.18, 'CA': 0.13, 'GB': 0.20, 'DE': 0.19,
      'FR': 0.20, 'IT': 0.22, 'ES': 0.21, 'AU': 0.10, 'JP': 0.10,
      'default': 0.10
    };
    
    const taxRate = taxRates[country] || taxRates.default;
    const taxAmount = subtotal * taxRate;

    return {
      taxAmount: this.roundCurrency(taxAmount),
      taxRate: taxRate,
      appliesToShipping: false
    };
  }
}

export default new CalculationService();