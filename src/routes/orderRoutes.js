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
  getOrderById,
  getOrderTracking,
  syncOrderStatus,
  bulkSyncOrders,
  cancelOrder,
  adminCancelOrder,
  getCancelledOrders,
  getCancellationStats,
  processRefund,
  retryRefund,
  resetRefundStatus,
  
} from "../controllers/orderController.js";
import { verifyUserToken } from "../middlewares/authToken.js";
import { verifyAdminToken } from "../middlewares/authToken.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { orderValidators } from "../validators/orderValidator.js";

const router = express.Router();

// 👇 USER ROUTES - Must come FIRST
router.post("/", verifyUserToken, validateRequest, createOrder);
router.get("/my-orders", verifyUserToken, getUserOrders);
router.post("/:orderId/cancel", verifyUserToken, cancelOrder);

// 👇 TRACKING ROUTES - Accessible to both users and admins
router.get("/:orderId/tracking", verifyUserToken, getOrderTracking);

// 👇 ADMIN ROUTES - Must come AFTER user-specific routes
router.get("/", verifyAdminToken, getAllOrders);
router.get("/filters", verifyAdminToken, getOrderFilters);
router.get("/filter", verifyAdminToken, filterOrders);
router.get("/stats", verifyAdminToken, getOrderStats);
router.get("/cancelled", verifyAdminToken, getCancelledOrders);
router.get("/cancellation-stats", verifyAdminToken, getCancellationStats);

router.patch("/:orderId/status", verifyAdminToken, orderValidators.updateStatus, validateRequest, updateOrderStatus);
router.post("/:orderId/retry-printify", verifyAdminToken, retryPrintifyForwarding);
router.post("/:orderId/sync-status", verifyAdminToken, syncOrderStatus);
router.post("/:orderId/admin-cancel", verifyAdminToken, adminCancelOrder);
router.post("/:orderId/process-refund", verifyAdminToken, processRefund);
router.post("/:orderId/retry-refund", verifyAdminToken, retryRefund);
router.post("/:orderId/reset-refund", verifyAdminToken, resetRefundStatus);

router.post("/bulk-sync", verifyAdminToken, bulkSyncOrders);

// 👇 ORDER DETAILS ROUTES - Must come LAST (most specific route)
router.get("/:orderId", verifyUserToken, getOrderById);

export default router;