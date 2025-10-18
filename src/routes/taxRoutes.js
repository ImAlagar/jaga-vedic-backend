import express from 'express';
import { taxController } from '../controllers/taxController.js';
import { verifyUserToken, verifyAdminToken } from '../middlewares/authToken.js';

const router = express.Router();

// ==================== PUBLIC ROUTES ====================
router.post('/calculate', taxController.calculateTax);
router.get('/countries', taxController.getCountryTaxRates);
router.get('/country/:countryCode', taxController.getTaxRateForCountry);

// ==================== USER ROUTES (Authenticated Users) ====================
router.get('/settings', taxController.getTaxSettings);
router.get('/validate', verifyAdminToken, taxController.validateTaxConfiguration);

// ==================== ADMIN ROUTES (Admin Users Only) ====================
router.put('/settings', verifyAdminToken, taxController.updateTaxSettings);


export default router;