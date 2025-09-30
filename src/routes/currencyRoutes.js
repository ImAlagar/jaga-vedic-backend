// src/routes/currencyRoutes.js
import express from "express";
import {
  getCurrencies,
  getExchangeRates,
  detectCurrency,
  updateRates,
  convertPrice,
  setManualRates
} from "../controllers/currencyController.js";

const router = express.Router();

// Public routes
router.get("/currencies", getCurrencies);
router.get("/exchange-rates", getExchangeRates);
router.get("/detect", detectCurrency);
router.get("/convert", convertPrice);

// Admin routes (uncomment if you want to protect these)
router.post("/update-rates", updateRates);
// router.post("/update-rates", verifyAdminToken, updateRates);
router.post("/manual-rates", setManualRates);

export default router;