import * as couponModel from "../models/couponModel.js";
import logger from "../utils/logger.js";

export class CouponService {
  /**
   * Validate coupon for a user's cart
   */
  async validateCoupon(code, userId, cartItems, subtotal) {
    try {
      logger.info('Validating coupon', { code, userId, cartItemsCount: cartItems?.length, subtotal });

      // Input validation
      if (!code || typeof code !== 'string') {
        throw new AppError('VALIDATION_ERROR', 'Coupon code is required and must be a string');
      }

      if (!Array.isArray(cartItems) || cartItems.length === 0) {
        throw new AppError('VALIDATION_ERROR', 'Cart items are required');
      }

      if (typeof subtotal !== 'number' || subtotal < 0) {
        throw new AppError('VALIDATION_ERROR', 'Valid subtotal amount is required');
      }

      // Find active coupon
      const coupon = await couponModel.findCouponByCode(code.trim().toUpperCase());
      if (!coupon) {
        return {
          isValid: false,
          error: "Invalid coupon code"
        };
      }

      // Validate coupon status
      if (!coupon.isActive) {
        return {
          isValid: false,
          error: "This coupon is no longer active"
        };
      }

      // Validate validity period
      const now = new Date();
      if (coupon.validFrom > now) {
        return {
          isValid: false,
          error: "This coupon is not yet valid"
        };
      }

      if (coupon.validUntil && coupon.validUntil < now) {
        return {
          isValid: false,
          error: "This coupon has expired"
        };
      }

      // Validate usage limits
      if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
        return {
          isValid: false,
          error: "This coupon has reached its usage limit"
        };
      }

      // Validate minimum order amount
      if (coupon.minOrderAmount && subtotal < coupon.minOrderAmount) {
        return {
          isValid: false,
          error: `Minimum order amount of $${coupon.minOrderAmount.toFixed(2)} required`
        };
      }

      // Validate user usage for single-use coupons
      if (coupon.isSingleUse && userId) {
        const hasUsed = await couponModel.hasUserUsedCoupon(coupon.id, userId);
        if (hasUsed) {
          return {
            isValid: false,
            error: "You have already used this coupon"
          };
        }
      }

      // Check coupon applicability to products
      const applicableItems = this._getApplicableItems(coupon, cartItems);
      if (applicableItems.length === 0) {
        return {
          isValid: false,
          error: "This coupon doesn't apply to any items in your cart"
        };
      }

      // Calculate applicable subtotal
      const applicableSubtotal = applicableItems.reduce(
        (sum, item) => sum + (item.price * item.quantity),
        0
      );

      // Calculate discount amount
      const discountAmount = this._calculateDiscount(coupon, applicableSubtotal);

      logger.info('Coupon validation successful', { 
        couponId: coupon.id, 
        discountAmount, 
        applicableItemsCount: applicableItems.length 
      });

      return {
        isValid: true,
        coupon: {
          id: coupon.id,
          code: coupon.code,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          discountAmount,
          applicableSubtotal,
          finalAmount: Math.max(0, subtotal - discountAmount),
          minOrderAmount: coupon.minOrderAmount,
          maxDiscountAmount: coupon.maxDiscountAmount
        },
        applicableItems
      };

    } catch (error) {
      logger.error('Coupon validation error', { error: error.message, code, userId });
      
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError('COUPON_VALIDATION_ERROR', `Coupon validation failed: ${error.message}`);
    }
  }

  /**
   * Mark coupon as used after successful order
   */
  async markCouponAsUsed(usageData) {
    try {
      const { couponId, userId, orderId, discountAmount, couponCode } = usageData;

      logger.info('Marking coupon as used', { couponId, userId, orderId, discountAmount });

      // Input validation
      if (!couponId || !userId || !orderId) {
        throw new AppError('VALIDATION_ERROR', 'couponId, userId, and orderId are required');
      }

      if (discountAmount && (typeof discountAmount !== 'number' || discountAmount < 0)) {
        throw new AppError('VALIDATION_ERROR', 'Valid discount amount is required');
      }

      await couponModel.recordCouponUsage({
        couponId: parseInt(couponId),
        userId: parseInt(userId),
        orderId: parseInt(orderId),
        discountAmount: discountAmount || 0,
        couponCode: couponCode || null
      });

      logger.info('Coupon marked as used successfully', { couponId, orderId });

      return { 
        success: true, 
        message: 'Coupon usage recorded successfully' 
      };

    } catch (error) {
      logger.error('Failed to mark coupon as used', { 
        error: error.message, 
        usageData 
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError('COUPON_USAGE_ERROR', `Failed to record coupon usage: ${error.message}`);
    }
  }

  /**
   * Get applicable items for coupon
   */
  _getApplicableItems(coupon, cartItems) {
    if (!coupon || !Array.isArray(cartItems)) {
      return [];
    }

    let applicableItems = [];

    switch (coupon.applicableTo) {
      case "ALL_PRODUCTS":
        applicableItems = cartItems;
        break;
      
      case "CATEGORY_SPECIFIC":
        applicableItems = cartItems.filter(item => {
          const itemCategory = item.product?.category || item.category;
          return coupon.categories.includes(itemCategory);
        });
        break;
      
      case "PRODUCT_SPECIFIC":
        applicableItems = cartItems.filter(item => 
          coupon.products.includes(item.productId)
        );
        break;
      
      default:
        applicableItems = [];
    }

    return applicableItems;
  }

  /**
   * Calculate discount amount
   */
  _calculateDiscount(coupon, applicableSubtotal) {
    if (!coupon || applicableSubtotal <= 0) {
      return 0;
    }

    let discountAmount = 0;

    try {
      if (coupon.discountType === "PERCENTAGE") {
        discountAmount = (applicableSubtotal * coupon.discountValue) / 100;
        
        // Apply max discount limit
        if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
          discountAmount = coupon.maxDiscountAmount;
        }
      } else if (coupon.discountType === "FIXED_AMOUNT") {
        discountAmount = Math.min(coupon.discountValue, applicableSubtotal);
      }

      // Ensure discount doesn't exceed applicable subtotal
      discountAmount = Math.min(discountAmount, applicableSubtotal);
      
      // Round to 2 decimal places
      discountAmount = Math.round(discountAmount * 100) / 100;

    } catch (error) {
      logger.error('Discount calculation error', { error: error.message, coupon, applicableSubtotal });
      discountAmount = 0;
    }

    return discountAmount;
  }

  /**
   * Create new coupon (Admin only)
   */
  async createCoupon(couponData) {
    try {
      logger.info('Creating new coupon', { code: couponData.code });

      // Generate unique code if not provided
      if (!couponData.code) {
        couponData.code = await this._generateUniqueCode();
      } else {
        // Validate code format
        const codeRegex = /^[A-Z0-9_-]+$/;
        if (!codeRegex.test(couponData.code)) {
          throw new AppError('VALIDATION_ERROR', 'Coupon code can only contain uppercase letters, numbers, hyphens, and underscores');
        }
      }

      // Validate code doesn't already exist
      const existing = await couponModel.findCouponByCode(couponData.code);
      if (existing) {
        throw new AppError('DUPLICATE_ERROR', 'Coupon code already exists');
      }

      // Validate discount values
      if (couponData.discountType === 'PERCENTAGE' && 
          (couponData.discountValue <= 0 || couponData.discountValue > 100)) {
        throw new AppError('VALIDATION_ERROR', 'Percentage discount must be between 0.1 and 100');
      }

      if (couponData.discountType === 'FIXED_AMOUNT' && couponData.discountValue <= 0) {
        throw new AppError('VALIDATION_ERROR', 'Fixed amount discount must be greater than 0');
      }

      const coupon = await couponModel.createCoupon({
        ...couponData,
        code: couponData.code.toUpperCase().trim()
      });

      logger.info('Coupon created successfully', { couponId: coupon.id });

      return coupon;

    } catch (error) {
      logger.error('Failed to create coupon', { error: error.message, couponData });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError('COUPON_CREATION_ERROR', `Failed to create coupon: ${error.message}`);
    }
  }

  /**
   * Generate unique coupon code
   */
  async _generateUniqueCode() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const codeLength = process.env.COUPON_CODE_LENGTH || 8;
    
    let code;
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      code = '';
      for (let i = 0; i < codeLength; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      
      const existing = await couponModel.findCouponByCode(code);
      if (!existing) {
        return code;
      }
      
      attempts++;
    }
    
    throw new AppError('GENERATION_ERROR', 'Failed to generate unique coupon code after multiple attempts');
  }

  /**
   * Get all coupons with pagination and filtering
   */
  async getAllCoupons(filters = {}) {
    try {
      const result = await couponModel.findAllCoupons(filters);
      return result;
    } catch (error) {
      logger.error('Failed to get coupons', { error: error.message, filters });
      throw new AppError('FETCH_ERROR', `Failed to retrieve coupons: ${error.message}`);
    }
  }

  /**
   * Get available coupons for user based on cart
   */
async getAvailableCoupons(userId, cartItems, subtotal) {
  try {

    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      throw new AppError('VALIDATION_ERROR', 'Cart items are required');
    }

    if (typeof subtotal !== 'number' || subtotal < 0) {
      throw new AppError('VALIDATION_ERROR', 'Valid subtotal amount is required');
    }

    const allCoupons = await couponModel.findAllActiveCoupons();
    const availableCoupons = [];
    const suggestedCoupons = [];


    for (const coupon of allCoupons) {
      try {
        const validation = await this._validateCouponForAvailability(
          coupon, 
          userId, 
          cartItems, 
          subtotal
        );

        if (validation.isValid) {
          const couponWithDiscount = {
            id: coupon.id,
            code: coupon.code,
            description: coupon.description,
            discountType: coupon.discountType,
            discountValue: coupon.discountValue,
            minOrderAmount: coupon.minOrderAmount,
            maxDiscountAmount: coupon.maxDiscountAmount,
            validUntil: coupon.validUntil,
            potentialDiscount: validation.discountAmount,
            potentialSavings: ((validation.discountAmount / subtotal) * 100).toFixed(1),
            applicableItemsCount: validation.applicableItems.length
          };

          availableCoupons.push(couponWithDiscount);

          if (validation.discountAmount > 0) {
            suggestedCoupons.push(couponWithDiscount);
          }
        }
      } catch (error) {
        continue;
      }
    }

    // Sort suggestions by potential savings
    suggestedCoupons.sort((a, b) => b.potentialDiscount - a.potentialDiscount);


    return {
      available: availableCoupons,
      suggestions: suggestedCoupons.slice(0, 3),
      totalAvailable: availableCoupons.length
    };

  } catch (error) {
    logger.error('Failed to get available coupons', { error: error.message, userId });
    throw new AppError('FETCH_ERROR', `Failed to get available coupons: ${error.message}`);
  }
}

// Add this method to your CouponService class in couponService.js

/**
 * Update existing coupon
 */
async updateCoupon(id, updateData) {
  try {
    logger.info('Updating coupon', { couponId: id, updateData });

    // Find the coupon
    const coupon = await couponModel.findCouponById(id);
    if (!coupon) {
      throw new AppError('NOT_FOUND', 'Coupon not found');
    }

    // Validate discount values if provided
    if (updateData.discountValue !== undefined) {
      if (updateData.discountType === 'PERCENTAGE' && 
          (updateData.discountValue <= 0 || updateData.discountValue > 100)) {
        throw new AppError('VALIDATION_ERROR', 'Percentage discount must be between 0.1 and 100');
      }

      if ((updateData.discountType === 'FIXED_AMOUNT' || coupon.discountType === 'FIXED_AMOUNT') && 
          updateData.discountValue <= 0) {
        throw new AppError('VALIDATION_ERROR', 'Fixed amount discount must be greater than 0');
      }
    }

    // If code is being updated, check for duplicates
    if (updateData.code && updateData.code !== coupon.code) {
      const codeRegex = /^[A-Z0-9_-]+$/;
      if (!codeRegex.test(updateData.code)) {
        throw new AppError('VALIDATION_ERROR', 'Coupon code can only contain uppercase letters, numbers, hyphens, and underscores');
      }

      const existing = await couponModel.findCouponByCode(updateData.code.toUpperCase().trim());
      if (existing && existing.id !== parseInt(id)) {
        throw new AppError('DUPLICATE_ERROR', 'Coupon code already exists');
      }
    }

    // Prepare update data
    const preparedData = { ...updateData };
    
    // Convert string numbers to proper types
    if (preparedData.discountValue !== undefined) {
      preparedData.discountValue = parseFloat(preparedData.discountValue);
    }
    if (preparedData.minOrderAmount !== undefined) {
      preparedData.minOrderAmount = preparedData.minOrderAmount ? parseFloat(preparedData.minOrderAmount) : null;
    }
    if (preparedData.maxDiscountAmount !== undefined) {
      preparedData.maxDiscountAmount = preparedData.maxDiscountAmount ? parseFloat(preparedData.maxDiscountAmount) : null;
    }
    if (preparedData.usageLimit !== undefined) {
      preparedData.usageLimit = preparedData.usageLimit ? parseInt(preparedData.usageLimit) : null;
    }
    if (preparedData.validUntil !== undefined) {
      preparedData.validUntil = preparedData.validUntil ? new Date(preparedData.validUntil) : null;
    }

    // Update code to uppercase if provided
    if (preparedData.code) {
      preparedData.code = preparedData.code.toUpperCase().trim();
    }

    // Update the coupon
    const updatedCoupon = await couponModel.updateCoupon(id, preparedData);

    logger.info('Coupon updated successfully', { couponId: id });

    return updatedCoupon;

  } catch (error) {
    logger.error('Failed to update coupon', { error: error.message, couponId: id, updateData });

    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError('COUPON_UPDATE_ERROR', `Failed to update coupon: ${error.message}`);
  }
}
  /**
   * Validate coupon without throwing errors (for availability check)
   */
  async _validateCouponForAvailability(coupon, userId, cartItems, subtotal) {
    const now = new Date();

    // Check basic validity
    if (!coupon.isActive) return { isValid: false };
    if (coupon.validFrom > now) return { isValid: false };
    if (coupon.validUntil && coupon.validUntil < now) return { isValid: false };
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) return { isValid: false };
    if (coupon.minOrderAmount && subtotal < coupon.minOrderAmount) return { isValid: false };

    // Check user usage for single-use coupons
    if (coupon.isSingleUse && userId) {
      const hasUsed = await couponModel.hasUserUsedCoupon(coupon.id, userId);
      if (hasUsed) return { isValid: false };
    }

    // Check applicability
    const applicableItems = this._getApplicableItems(coupon, cartItems);
    if (applicableItems.length === 0) return { isValid: false };

    // Calculate discount
    const applicableSubtotal = applicableItems.reduce(
      (sum, item) => sum + (item.price * item.quantity),
      0
    );

    const discountAmount = this._calculateDiscount(coupon, applicableSubtotal);

    return {
      isValid: true,
      discountAmount,
      applicableItems
    };
  }

  /**
   * Get public available coupons
   */
  async getPublicAvailableCoupons(filters = {}) {
    try {
      const allCoupons = await couponModel.findAllActiveCoupons();
      
      const now = new Date();
      const availableCoupons = allCoupons.filter(coupon => {
        if (!coupon.isActive) return false;
        if (coupon.validFrom > now) return false;
        if (coupon.validUntil && coupon.validUntil < now) return false;
        if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) return false;
        
        if (filters.category && coupon.applicableTo === 'CATEGORY_SPECIFIC') {
          return coupon.categories.includes(filters.category);
        }
        
        if (filters.minOrderAmount && coupon.minOrderAmount) {
          return coupon.minOrderAmount <= filters.minOrderAmount;
        }
        
        return true;
      });

      return availableCoupons.map(coupon => ({
        id: coupon.id,
        code: coupon.code,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        minOrderAmount: coupon.minOrderAmount,
        maxDiscountAmount: coupon.maxDiscountAmount,
        validUntil: coupon.validUntil,
        applicableTo: coupon.applicableTo,
        categories: coupon.categories,
      }));

    } catch (error) {
      logger.error('Failed to get public coupons', { error: error.message, filters });
      throw new AppError('FETCH_ERROR', `Failed to get public coupons: ${error.message}`);
    }
  }
}

export const couponService = new CouponService();