// src/controllers/calculationController.js
import calculationService from '../services/calculationService.js';

export const calculateCartTotals = async (req, res) => {
  try {
    const { cartItems, shippingAddress, couponCode } = req.body;
    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart items are required'
      });
    }

    if (!shippingAddress || !shippingAddress.country) {
      return res.status(400).json({
        success: false,
        message: 'Shipping address with country is required'
      });
    }

    const result = await calculationService.calculateCartTotals(
      cartItems,
      shippingAddress,
      couponCode
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