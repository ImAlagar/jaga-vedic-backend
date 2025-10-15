// src/routes/shippingRoutes.js
import express from 'express';
import { shippingController } from '../controllers/shippingController.js';
import { verifyUserToken, verifyAdminToken } from '../middlewares/authToken.js';

const router = express.Router();

// Public routes - no authentication required
router.post('/estimates', shippingController.getShippingEstimates);
router.post('/calculate', shippingController.calculatePrintifyShipping);
router.post('/product', shippingController.getProductShipping);
router.get('/test', shippingController.testShipping);
router.get('/debug-products', shippingController.debugProducts);
router.get('/test-connection', shippingController.testConnection); // New endpoint
router.get('/products/:productId/variants', shippingController.getProductVariants); // New endpoint
router.get('/countries', shippingController.getSupportedCountries);

// User routes (require authentication)
router.get('/order/:orderId', verifyUserToken, shippingController.getOrderShipping);

// Admin routes (require admin authentication)
router.patch('/order/:orderId/tracking', verifyAdminToken, shippingController.updateOrderTracking);

export default router;