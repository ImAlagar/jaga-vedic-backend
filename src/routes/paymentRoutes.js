import express from "express";
import { 
  createPaymentOrder, 
  verifyPayment, 
  getPaymentStatus,
  processRefund 
} from "../controllers/paymentController.js";
import { verifyUserToken } from "../middlewares/authToken.js";

const router = express.Router();

// Payment routes
router.post("/create-order", verifyUserToken, createPaymentOrder);
router.post("/verify", verifyUserToken, verifyPayment);
router.get("/status/:orderId", verifyUserToken, getPaymentStatus);
router.post("/refund/:orderId", verifyUserToken, processRefund);

export default router;