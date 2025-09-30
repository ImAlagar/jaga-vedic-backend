// src/controllers/currencyController.js
import { currencyService } from "../services/currencyService.js";
import { successResponse, errorResponse } from "../utils/responseHandler.js";
import HttpStatus from "../constants/httpStatusCode.js";

export async function getCurrencies(req, res) {
  try {
    const currencies = await currencyService.getAllCurrencies();
    return successResponse(res, currencies, "Currencies fetched successfully");
  } catch (error) {
    console.error("❌ Error in getCurrencies:", error);
    return errorResponse(res, error.message || "Failed to fetch currencies", HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

export async function getExchangeRates(req, res) {
  try {
    const rates = await currencyService.getExchangeRates();
    return successResponse(res, rates, "Exchange rates fetched successfully");
  } catch (error) {
    console.error("❌ Error in getExchangeRates:", error);
    return errorResponse(res, error.message || "Failed to fetch exchange rates", HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

export async function detectCurrency(req, res) {
  try {
    const currency = await currencyService.detectUserCurrency(req);
    return successResponse(res, currency, "Currency detected successfully");
  } catch (error) {
    console.error("❌ Error in detectCurrency:", error);
    return errorResponse(res, error.message || "Failed to detect currency", HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

export async function updateRates(req, res) {
  try {
    const result = await currencyService.updateExchangeRates();
    return successResponse(res, result, "Exchange rates updated successfully");
  } catch (error) {
    console.error("❌ Error in updateRates:", error);
    return errorResponse(res, error.message || "Failed to update exchange rates", HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

export async function convertPrice(req, res) {
  try {
    const { amount, from = 'USD', to } = req.query;
    
    if (!amount || isNaN(amount)) {
      return errorResponse(res, "Valid amount is required", HttpStatus.BAD_REQUEST);
    }
    
    if (!to) {
      return errorResponse(res, "Target currency is required", HttpStatus.BAD_REQUEST);
    }

    const converted = await currencyService.convertPrice(
      parseFloat(amount), 
      from.toUpperCase(), 
      to.toUpperCase()
    );

    const formatted = await currencyService.formatPrice(converted, to.toUpperCase());

    return successResponse(res, {
      original: parseFloat(amount),
      converted,
      formatted,
      from: from.toUpperCase(),
      to: to.toUpperCase()
    }, "Price converted successfully");
    
  } catch (error) {
    console.error("❌ Error in convertPrice:", error);
    return errorResponse(res, error.message || "Failed to convert price", HttpStatus.BAD_REQUEST);
  }
}

// Add manual rates endpoint for testing
export async function setManualRates(req, res) {
  try {
    const { rates } = req.body;
    
    if (!rates || typeof rates !== 'object') {
      return errorResponse(res, "Rates object is required", HttpStatus.BAD_REQUEST);
    }

    const result = await currencyService.setManualRates(rates);
    return successResponse(res, result, "Manual rates set successfully");
    
  } catch (error) {
    console.error("❌ Error in setManualRates:", error);
    return errorResponse(res, error.message || "Failed to set manual rates", HttpStatus.BAD_REQUEST);
  }
}