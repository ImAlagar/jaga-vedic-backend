// src/routes/orderCalculationRoutes.js
import express from 'express';
import { 
  calculateOrderTotals, 
  calculateQuickTotals 
} from '../controllers/calculationController.js';
import { verifyUserToken } from '../middlewares/authToken.js';

const router = express.Router();

// Calculate complete order totals (with real-time shipping, tax, coupon)
router.post('/calculate-totals', verifyUserToken, calculateOrderTotals);

// Quick calculation for cart preview
router.post('/quick-calculate', calculateQuickTotals);

export default router;