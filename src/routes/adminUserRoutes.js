// routes/adminUserRoutes.js
import express from "express";
import { 
  getUserById, 
  getUsers, 
  toggleUserStatus, 
  getUserStats // Add this import
} from "../controllers/userController.js";
import { verifyAdminToken } from "../middlewares/authToken.js";

const router = express.Router();

// Admin user management routes
router.get("/users", verifyAdminToken, getUsers);
router.get("/users/stats", verifyAdminToken, getUserStats); // Add this route
router.put("/users/:userId/status", verifyAdminToken, toggleUserStatus);
router.get("/users/:userId", verifyAdminToken, getUserById);

export default router;