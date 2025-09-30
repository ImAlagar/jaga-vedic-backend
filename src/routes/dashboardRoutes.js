import { Router } from 'express';
import { verifyAdminToken } from '../middlewares/authToken.js';
import DashboardController from "../controllers/dashboardController.js";

const router = Router();

// All routes are protected and admin-only
router.get('/stats', verifyAdminToken, DashboardController.getDashboardStats);
router.get('/sales-overview', verifyAdminToken, DashboardController.getSalesOverview);
router.get('/best-selling', verifyAdminToken, DashboardController.getBestSellingProducts);
router.get('/order-volume', verifyAdminToken, DashboardController.getOrderVolume);
router.get('/refunds-returns', verifyAdminToken, DashboardController.getRefundsReturns);

export default router;