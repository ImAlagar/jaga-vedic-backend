import express from "express";
import adminRoutes from "./adminRoutes.js";
import userRoutes from "./userRoutes.js";
import adminUserRoutes from "./adminUserRoutes.js";
import productRoutes from "./productRoutes.js";
import orderRoutes from "./orderRoutes.js";
import paymentRoutes from "./paymentRoutes.js";
import webhookRoutes from "./webhookRoutes.js";
import debugRoutes from "./debugRoutes.js";
import dashboardRoutes from "./dashboardRoutes.js";
import contactRoutes from "./contactRoutes.js";
import searchRoutes from "./searchRoutes.js";
import couponRoutes from "./couponRoutes.js";
import lookbookRoutes from "./lookbookRoutes.js";

const router = express.Router();

// Register all routes with proper base paths
router.use("/admin", adminRoutes);
router.use("/admin", adminUserRoutes);
router.use("/users", userRoutes);
router.use("/products", productRoutes);
router.use("/orders", orderRoutes);
router.use("/payments", paymentRoutes);
router.use("/webhooks", webhookRoutes); // Webhooks have separate path
router.use("/debug", debugRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/contact", contactRoutes);
router.use("/search", searchRoutes);
router.use("/coupons", couponRoutes);
router.use('/lookbook', lookbookRoutes);

export default router;