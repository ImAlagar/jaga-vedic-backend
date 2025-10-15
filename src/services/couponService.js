import * as couponModel from "../models/couponModel.js";

export class CouponService {
async validateCoupon(code, userId, cartItems, subtotal) {
  try {
    // Find active coupon
    const coupon = await couponModel.findCouponByCode(code);
    if (!coupon) {
      return {
        isValid: false,
        error: "Invalid coupon code"
      };
    }


    // Check if coupon is active
    if (!coupon.isActive) {
      return {
        isValid: false,
        error: "This coupon is no longer active"
      };
    }

    // Check validity period
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

    // Check usage limit
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return {
        isValid: false,
        error: "This coupon has reached its usage limit"
      };
    }

    // Check minimum order amount
    if (coupon.minOrderAmount && subtotal < coupon.minOrderAmount) {

      return {
        isValid: false,
        error: `Minimum order amount of $${coupon.minOrderAmount} required`
      };
    }

    // Check if user already used this coupon (for single-use coupons)
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
    const applicableItems = this.getApplicableItems(coupon, cartItems);
    


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
    const discountAmount = this.calculateDiscount(
      coupon,
      applicableSubtotal
    );



    return {
      isValid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountAmount,
        applicableSubtotal,
        finalAmount: subtotal - discountAmount
      },
      applicableItems
    };
  } catch (error) {
    console.error('💥 [BACKEND] Coupon validation error:', error);
    return {
      isValid: false,
      error: error.message
    };
  }
} 

getApplicableItems(coupon, cartItems) {

  let result = [];

  switch (coupon.applicableTo) {
    case "ALL_PRODUCTS":
      result = cartItems;
      break;
    
    case "CATEGORY_SPECIFIC":
      result = cartItems.filter(item => {
        const itemCategory = item.product?.category || item.category;
        const isInCategory = coupon.categories.includes(itemCategory);
        return isInCategory;
      });
      break;
    
    case "PRODUCT_SPECIFIC":
      result = cartItems.filter(item => {
        const isInProducts = coupon.products.includes(item.productId);
        return isInProducts;
      });
      break;
    
    default:
      result = [];
  }



  return result;
}
  // Calculate discount amount
  calculateDiscount(coupon, applicableSubtotal) {
    let discountAmount = 0;

    if (coupon.discountType === "PERCENTAGE") {
      discountAmount = (applicableSubtotal * coupon.discountValue) / 100;
      
      // Apply max discount limit
      if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
        discountAmount = coupon.maxDiscountAmount;
      }
    } else if (coupon.discountType === "FIXED_AMOUNT") {
      discountAmount = Math.min(coupon.discountValue, applicableSubtotal);
    }

    return Math.round(discountAmount * 100) / 100; // Round to 2 decimal places
  }

  // Apply coupon to order
  async applyCouponToOrder(orderId, couponId, userId, discountAmount, couponCode) {
    return await couponModel.recordCouponUsage({
      couponId,
      userId,
      orderId,
      discountAmount,
      couponCode
    });
  }

  // Create new coupon (Admin only)
  async createCoupon(couponData) {
    // Generate unique code if not provided
    if (!couponData.code) {
      couponData.code = await this.generateUniqueCode();
    }

    // Validate code doesn't already exist
    const existing = await couponModel.findCouponByCode(couponData.code);
    if (existing) {
      throw new Error("Coupon code already exists");
    }

    return await couponModel.createCoupon(couponData);
  }

  // Generate unique coupon code
  async generateUniqueCode() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const codeLength = process.env.COUPON_CODE_LENGTH || 8;
    
    let code;
    let isUnique = false;
    
    while (!isUnique) {
      code = '';
      for (let i = 0; i < codeLength; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      
      const existing = await couponModel.findCouponByCode(code);
      if (!existing) {
        isUnique = true;
      }
    }
    
    return code;
  }

  // Get all coupons (Admin)
  async getAllCoupons(filters = {}) {
    return await couponModel.findAllCoupons(filters);
  }

  // Update coupon
  async updateCoupon(couponId, updateData) {
    return await couponModel.updateCoupon(couponId, updateData);
  }

  // Delete coupon
  async deleteCoupon(couponId) {
    return await couponModel.deleteCoupon(couponId);
  }

  // Get coupon statistics
  async getCouponStats() {
    return await couponModel.getCouponStats();
  }


    // Get available coupons for user based on cart
  async getAvailableCoupons(userId, cartItems, subtotal) {
    try {
      // Get all active coupons
      const allCoupons = await couponModel.findAllActiveCoupons();
      
      const availableCoupons = [];
      const suggestedCoupons = [];

      for (const coupon of allCoupons) {
        try {
          // Validate each coupon against the current cart
          const validation = await this.validateCouponForAvailability(
            coupon, 
            userId, 
            cartItems, 
            subtotal
          );

          if (validation.isValid) {
            const couponWithDiscount = {
              ...coupon,
              potentialDiscount: validation.discountAmount,
              potentialSavings: ((validation.discountAmount / subtotal) * 100).toFixed(1)
            };

            availableCoupons.push(couponWithDiscount);

            // Suggest coupons with highest savings
            if (validation.discountAmount > 0) {
              suggestedCoupons.push(couponWithDiscount);
            }
          }
        } catch (error) {
          // Skip invalid coupons
          continue;
        }
      }

      // Sort suggestions by potential savings
      suggestedCoupons.sort((a, b) => b.potentialDiscount - a.potentialDiscount);

      return {
        available: availableCoupons,
        suggestions: suggestedCoupons.slice(0, 3), // Top 3 suggestions
        totalAvailable: availableCoupons.length
      };
    } catch (error) {
      throw new Error(`Failed to get available coupons: ${error.message}`);
    }
  }

    // Validate coupon without throwing errors (for availability check)
  async validateCouponForAvailability(coupon, userId, cartItems, subtotal) {
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
    const applicableItems = this.getApplicableItems(coupon, cartItems);
    if (applicableItems.length === 0) return { isValid: false };

    // Calculate discount
    const applicableSubtotal = applicableItems.reduce(
      (sum, item) => sum + (item.price * item.quantity),
      0
    );

    const discountAmount = this.calculateDiscount(coupon, applicableSubtotal);

    return {
      isValid: true,
      discountAmount,
      applicableItems
    };
  }

  // Mark coupon as used after successful payment
  async markCouponAsUsed(couponId, userId, orderId, discountAmount, couponCode) {
    try {
      await couponModel.recordCouponUsage({
        couponId,
        userId,
        orderId,
        discountAmount,
        couponCode
      });

      return { success: true };
    } catch (error) {
      console.error('Failed to mark coupon as used:', error);
      throw new Error('Failed to record coupon usage');
    }
  }

  // Check if user can use coupon (for frontend validation)
  async canUserUseCoupon(couponCode, userId) {
    const coupon = await couponModel.findCouponByCode(couponCode);
    if (!coupon) return { canUse: false, reason: 'Invalid coupon' };

    if (coupon.isSingleUse && userId) {
      const hasUsed = await couponModel.hasUserUsedCoupon(coupon.id, userId);
      if (hasUsed) {
        return { canUse: false, reason: 'You have already used this coupon' };
      }
    }

    return { canUse: true, coupon };
  }
  // In couponService.js
    async getPublicAvailableCoupons(filters = {}) {
      try {
        const allCoupons = await couponModel.findAllActiveCoupons();
        
        const now = new Date();
        const availableCoupons = allCoupons.filter(coupon => {
          // Basic validity checks
          if (!coupon.isActive) return false;
          if (coupon.validFrom > now) return false;
          if (coupon.validUntil && coupon.validUntil < now) return false;
          if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) return false;
          
          // Filter by category if provided
          if (filters.category && coupon.applicableTo === 'CATEGORY_SPECIFIC') {
            return coupon.categories.includes(filters.category);
          }
          
          // Filter by minimum order amount
          if (filters.minOrderAmount && coupon.minOrderAmount) {
            return coupon.minOrderAmount <= filters.minOrderAmount;
          }
          
          return true;
        });

        // Return limited information for public display
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
          // Don't include usage stats or sensitive info
        }));
      } catch (error) {
        throw new Error(`Failed to get public coupons: ${error.message}`);
      }
    }
}

export const couponService = new CouponService();