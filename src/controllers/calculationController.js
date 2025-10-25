// src/controllers/calculationController.js
import calculationService from '../services/calculationService.js';

export const calculateOrderTotals = async (req, res) => {
  try {
    const { cartItems, shippingAddress, couponCode } = req.body;
    const userId = req.user?.id;

    console.log('📦 Calculation Request:', {
      itemCount: cartItems?.length,
      country: shippingAddress?.country,
      couponCode: couponCode,
      userId: userId
    });

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

    const result = await calculationService.calculateOrderTotals(
      cartItems,
      shippingAddress,
      couponCode,
      userId
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

    const result = await calculationService.calculateQuickTotals(
      cartItems,
      country,
      couponCode
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