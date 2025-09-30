import * as couponModel from "../models/couponModel.js";

export class CouponService {
  // Validate coupon and calculate discount
  async validateCoupon(code, userId, cartItems, subtotal) {
    try {
      // Find active coupon
      const coupon = await couponModel.findCouponByCode(code);
      if (!coupon) {
        throw new Error("Invalid coupon code");
      }

      // Check if coupon is active
      if (!coupon.isActive) {
        throw new Error("This coupon is no longer active");
      }

      // Check validity period
      const now = new Date();
      if (coupon.validFrom > now) {
        throw new Error("This coupon is not yet valid");
      }

      if (coupon.validUntil && coupon.validUntil < now) {
        throw new Error("This coupon has expired");
      }

      // Check usage limit
      if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
        throw new Error("This coupon has reached its usage limit");
      }

      // Check minimum order amount
      if (coupon.minOrderAmount && subtotal < coupon.minOrderAmount) {
        throw new Error(`Minimum order amount of $${coupon.minOrderAmount} required`);
      }

      // Check if user already used this coupon (for single-use coupons)
      if (coupon.isSingleUse && userId) {
        const hasUsed = await couponModel.hasUserUsedCoupon(coupon.id, userId);
        if (hasUsed) {
          throw new Error("You have already used this coupon");
        }
      }

      // Check coupon applicability to products
      const applicableItems = this.getApplicableItems(coupon, cartItems);
      if (applicableItems.length === 0) {
        throw new Error("This coupon doesn't apply to any items in your cart");
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
      return {
        isValid: false,
        error: error.message
      };
    }
  }

  // Get items that the coupon applies to
  getApplicableItems(coupon, cartItems) {
    switch (coupon.applicableTo) {
      case "ALL_PRODUCTS":
        return cartItems;
      
      case "CATEGORY_SPECIFIC":
        return cartItems.filter(item => 
          coupon.categories.includes(item.product?.category || item.category)
        );
      
      case "PRODUCT_SPECIFIC":
        return cartItems.filter(item => 
          coupon.products.includes(item.productId)
        );
      
      default:
        return [];
    }
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
}

export const couponService = new CouponService();