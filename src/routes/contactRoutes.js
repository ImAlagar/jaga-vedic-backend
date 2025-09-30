// src/routes/contactRoutes.js
import express from "express";
import {
  submitContact,
  getAllInquiries,
  getInquiryById,
  updateInquiryStatus,
  getInquiryStats
} from "../controllers/contactController.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { contactValidator, updateInquiryStatusValidator } from "../validators/contactValidator.js";
import { verifyAdminToken } from "../middlewares/authToken.js";

const router = express.Router();

// Public routes
router.post("/submit", contactValidator, validateRequest, submitContact);

// Admin protected routes
router.get("/admin/inquiries", verifyAdminToken, getAllInquiries);
router.get("/admin/inquiries/stats", verifyAdminToken, getInquiryStats);
router.get("/admin/inquiries/:id", verifyAdminToken, getInquiryById);
router.patch(
  "/admin/inquiries/:id/status", 
  verifyAdminToken, 
  updateInquiryStatusValidator, 
  validateRequest, 
  updateInquiryStatus
);

export default router;