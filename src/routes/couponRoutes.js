// routes/couponRoutes.js
import express from "express";
import {
  validateCoupon,
  createCoupon,
  getCoupons,
  getCoupon,
  updateCoupon,
  deleteCoupon,
  getCouponStats,
  getAvailableCoupons,
  markCouponAsUsed,
  getPublicAvailableCoupons
} from "../controllers/couponController.js";
import { verifyAdminToken, verifyUserToken } from "../middlewares/authToken.js";

const router = express.Router();

// Public routes
router.post("/validate", validateCoupon);

// User routes (require authentication)
router.post("/available", getAvailableCoupons);
router.post("/mark-used", verifyUserToken, markCouponAsUsed);
router.get("/public/available", getPublicAvailableCoupons);
// Admin routes
router.post("/", verifyAdminToken, createCoupon);
router.get("/", verifyAdminToken, getCoupons);
router.get("/stats", verifyAdminToken, getCouponStats);
router.get("/:id", verifyAdminToken, getCoupon);
router.put("/:id", verifyAdminToken, updateCoupon);
router.delete("/:id", verifyAdminToken, deleteCoupon);

export default router;