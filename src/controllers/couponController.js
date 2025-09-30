import HttpStatus from "../constants/httpStatusCode.js";
import { couponService } from "../services/couponService.js";
import { successResponse, errorResponse } from "../utils/responseHandler.js";

export async function validateCoupon(req, res) {
  try {
    const { code, cartItems, subtotal } = req.body;
    const userId = req.user?.id; // From auth middleware

    if (!code || !cartItems || subtotal === undefined) {
      return errorResponse(res, "Code, cartItems, and subtotal are required", HttpStatus.BAD_REQUEST);
    }

    const validation = await couponService.validateCoupon(
      code, 
      userId, 
      cartItems, 
      parseFloat(subtotal)
    );

    if (!validation.isValid) {
      return errorResponse(res, validation.error, HttpStatus.BAD_REQUEST);
    }

    return successResponse(
      res,
      validation,
      "Coupon applied successfully",
      HttpStatus.OK
    );
  } catch (error) {
    return errorResponse(res, error.message, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

export async function createCoupon(req, res) {
  try {
    const {
      code,
      description,
      discountType,
      discountValue,
      minOrderAmount,
      maxDiscountAmount,
      usageLimit,
      validUntil,
      isSingleUse,
      applicableTo,
      categories = [],
      products = []
    } = req.body;

    // Validate required fields
    if (!code || !discountType || discountValue === undefined) {
      return errorResponse(res, "Code, discountType, and discountValue are required", HttpStatus.BAD_REQUEST);
    }

    // Validate discount value based on type
    if (discountType === 'PERCENTAGE' && (discountValue <= 0 || discountValue > 100)) {
      return errorResponse(res, "Percentage discount must be between 0.1 and 100", HttpStatus.BAD_REQUEST);
    }

    if (discountType === 'FIXED_AMOUNT' && discountValue <= 0) {
      return errorResponse(res, "Fixed amount discount must be greater than 0", HttpStatus.BAD_REQUEST);
    }

    // Prepare coupon data
    const couponData = {
      code: code.toUpperCase().trim(),
      description: description?.trim(),
      discountType,
      discountValue: parseFloat(discountValue),
      minOrderAmount: minOrderAmount ? parseFloat(minOrderAmount) : null,
      maxDiscountAmount: maxDiscountAmount ? parseFloat(maxDiscountAmount) : null,
      usageLimit: usageLimit ? parseInt(usageLimit) : null,
      validUntil: validUntil ? new Date(validUntil) : null,
      isSingleUse: Boolean(isSingleUse),
      applicableTo,
      categories: Array.isArray(categories) ? categories : [],
      products: Array.isArray(products) ? products.map(p => parseInt(p)) : []
    };

    const coupon = await couponService.createCoupon(couponData);
    
    return successResponse(
      res,
      coupon,
      "Coupon created successfully",
      HttpStatus.CREATED
    );
  } catch (error) {
    return errorResponse(res, error.message, HttpStatus.BAD_REQUEST);
  }
}

export async function getCoupons(req, res) {
  try {
    const filters = req.query;
    
    const result = await couponService.getAllCoupons(filters);
    
    return successResponse(
      res,
      result,
      "Coupons retrieved successfully",
      HttpStatus.OK
    );
  } catch (error) {
    return errorResponse(res, error.message, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

export async function getCoupon(req, res) {
  try {
    const { id } = req.params;
    
    const coupon = await couponModel.findCouponById(id);
    
    if (!coupon) {
      return errorResponse(res, "Coupon not found", HttpStatus.NOT_FOUND);
    }
    
    return successResponse(
      res,
      coupon,
      "Coupon retrieved successfully",
      HttpStatus.OK
    );
  } catch (error) {
    return errorResponse(res, error.message, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

export async function updateCoupon(req, res) {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const coupon = await couponService.updateCoupon(id, updateData);
    
    return successResponse(
      res,
      coupon,
      "Coupon updated successfully",
      HttpStatus.OK
    );
  } catch (error) {
    return errorResponse(res, error.message, HttpStatus.BAD_REQUEST);
  }
}

export async function deleteCoupon(req, res) {
  try {
    const { id } = req.params;
    
    await couponService.deleteCoupon(id);
    
    return successResponse(
      res,
      null,
      "Coupon deleted successfully",
      HttpStatus.OK
    );
  } catch (error) {
    return errorResponse(res, error.message, HttpStatus.BAD_REQUEST);
  }
}

export async function getCouponStats(req, res) {
  try {
    const stats = await couponService.getCouponStats();
    
    return successResponse(
      res,
      stats,
      "Coupon statistics retrieved successfully",
      HttpStatus.OK
    );
  } catch (error) {
    return errorResponse(res, error.message, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}