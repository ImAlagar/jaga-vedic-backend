// src/routes/orderRoutes.js
import express from "express";
import { 
  createOrder, 
  getUserOrders, 
  getAllOrders, 
  updateOrderStatus,
  retryPrintifyForwarding,
  getOrderStats,  // Add this import
  getOrderFilters,
  filterOrders
} from "../controllers/orderController.js";
import { verifyUserToken } from "../middlewares/authToken.js";
import { verifyAdminToken } from "../middlewares/authToken.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { orderValidators } from "../validators/orderValidator.js";

const router = express.Router();

// User routes
router.post("/", verifyUserToken, orderValidators.createOrder, validateRequest, createOrder);
router.get("/my-orders", verifyUserToken, getUserOrders);

router.get("/filters", verifyAdminToken, getOrderFilters);     // ADD THIS
router.get("/filter", verifyAdminToken, filterOrders);  

// Admin routes
router.get("/", verifyAdminToken, getAllOrders);
router.get("/stats", verifyAdminToken, getOrderStats); // Add this route
router.patch("/:orderId/status", verifyAdminToken, orderValidators.updateStatus, validateRequest, updateOrderStatus);
router.post("/:orderId/retry-printify", verifyAdminToken, retryPrintifyForwarding);

export default router;