// src/routes/orderRoutes.js
import express from "express";
import { 
  createOrder, 
  getUserOrders, 
  getAllOrders, 
  updateOrderStatus,
  retryPrintifyForwarding,
  getOrderStats,
  getOrderFilters,
  filterOrders,
  getOrderById
} from "../controllers/orderController.js";
import { verifyUserToken } from "../middlewares/authToken.js";
import { verifyAdminToken } from "../middlewares/authToken.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { orderValidators } from "../validators/orderValidator.js";

const router = express.Router();

// 👇 USER ROUTES - Must come FIRST
router.post("/", verifyUserToken, orderValidators.createOrder, validateRequest, createOrder);
router.get("/my-orders", verifyUserToken, getUserOrders);

// 👇 ADMIN ROUTES - Must come AFTER user-specific routes
router.get("/", verifyAdminToken, getAllOrders);
router.get("/filters", verifyAdminToken, getOrderFilters);
router.get("/filter", verifyAdminToken, filterOrders);
router.get("/stats", verifyAdminToken, getOrderStats);
router.patch("/:orderId/status", verifyAdminToken, orderValidators.updateStatus, validateRequest, updateOrderStatus);
router.post("/:orderId/retry-printify", verifyAdminToken, retryPrintifyForwarding);

// 👇 USER ORDER DETAILS - Must come LAST (most specific route)
router.get("/:orderId", verifyUserToken, getOrderById);

export default router;