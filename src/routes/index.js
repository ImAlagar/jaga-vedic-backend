// routes/index.js
import express from "express";
import adminRoutes from "./adminRoutes.js";
import userRoutes from "./userRoutes.js";
import adminUserRoutes from "./adminUserRoutes.js";
import productRoutes from "./productRoutes.js";

const router = express.Router();

router.use("/admin", adminRoutes);
router.use("/admin", adminUserRoutes);
router.use("/users", userRoutes);
router.use("/products", productRoutes); // Add this line

export default router;