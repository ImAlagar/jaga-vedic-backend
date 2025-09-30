import express from "express";
import {
  validateCoupon,
  createCoupon,
  getCoupons,
  getCoupon,
  updateCoupon,
  deleteCoupon,
  getCouponStats
} from "../controllers/couponController.js";
        import { verifyAdminToken } from "../middlewares/authToken.js";

const router = express.Router();

// Public route - coupon validation (for cart)
router.post("/validate", validateCoupon);

// Admin routes
router.post("/", verifyAdminToken, createCoupon);
router.get("/", verifyAdminToken, getCoupons);
router.get("/stats", verifyAdminToken, getCouponStats);
router.get("/:id", verifyAdminToken, getCoupon);
router.put("/:id", verifyAdminToken, updateCoupon);
router.delete("/:id", verifyAdminToken, deleteCoupon);

export default router;