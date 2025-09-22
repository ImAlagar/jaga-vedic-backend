// routes/userRoutes.js
import express from "express";
import {
  register,
  login,
  getProfile,
  updateProfile,
  forgotPassword,
  resetPassword
} from "../controllers/userController.js";
import {
  registerValidator,
  loginValidator,
  updateProfileValidator,
  changePasswordValidator
} from "../validators/userValidator.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { verifyUserToken } from "../middlewares/authToken.js";

const router = express.Router();

// Public routes
router.post("/register", registerValidator, validateRequest, register);
router.post("/login", loginValidator, validateRequest, login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

// Protected routes
router.get("/profile", verifyUserToken, getProfile);
router.put("/profile", verifyUserToken, updateProfileValidator, validateRequest, updateProfile);

export default router;