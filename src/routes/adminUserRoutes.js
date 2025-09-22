// routes/adminUserRoutes.js
import express from "express";
import { getUsers, toggleUserStatus } from "../controllers/userController.js";
import { verifyAdminToken } from "../middlewares/authToken.js";

const router = express.Router();

// Admin user management routes
router.get("/users", verifyAdminToken, getUsers);
router.put("/users/:userId/status", verifyAdminToken, toggleUserStatus);

export default router;