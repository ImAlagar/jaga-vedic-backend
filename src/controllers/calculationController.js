// src/controllers/calculationController.js (UPDATED)
import calculationService from '../services/calculationService.js';
import geolocationService from '../services/geolocationService.js';

export const calculateOrderTotals = async (req, res) => {
  try {
    const { cartItems, shippingAddress, couponCode } = req.body;
    const userId = req.user?.id;

    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart items are required and cannot be empty'
      });
    }

    if (!shippingAddress || !shippingAddress.country) {
      return res.status(400).json({
        success: false,
        message: 'Shipping address with country is required'
      });
    }

    // Get user IP for currency detection
    const userIp = geolocationService.getIPFromRequest(req);

    const result = await calculationService.calculateOrderTotals(
      cartItems,
      shippingAddress,
      couponCode,
      userId,
      userIp
    );

    res.json(result);

  } catch (error) {
    console.error('❌ Calculation controller error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during calculation',
      error: error.message
    });
  }
};

export const calculateQuickTotals = async (req, res) => {
  try {
    const { cartItems, country, couponCode } = req.body;

    if (!cartItems || !Array.isArray(cartItems)) {
      return res.status(400).json({
        success: false,
        message: 'Cart items are required'
      });
    }

    if (!country) {
      return res.status(400).json({
        success: false,
        message: 'Country is required'
      });
    }

    // Get user IP for currency detection
    const userIp = geolocationService.getIPFromRequest(req);

    const result = await calculationService.calculateQuickTotals(
      cartItems,
      country,
      couponCode,
      userIp
    );

    res.json(result);

  } catch (error) {
    console.error('❌ Quick calculation error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during quick calculation',
      error: error.message
    });
  }
};

// New endpoint to get currency info
export const getCurrencyInfo = async (req, res) => {
  try {
    const userIp = geolocationService.getIPFromRequest(req);
    const location = await geolocationService.getUserLocationFromIP(userIp);
    
    res.json({
      success: true,
      data: location
    });
    
  } catch (error) {
    console.error('❌ Currency info error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get currency information',
      error: error.message
    });
  }
};