// src/controllers/calculationController.js
import calculationService from '../services/calculationService.js';

export const calculateCartTotals = async (req, res) => {
  try {
    const { cartItems, shippingAddress, couponCode } = req.body;

    console.log('📦 Calculating totals for:', {
      itemCount: cartItems?.length,
      country: shippingAddress?.country,
      coupon: couponCode || 'none'
    });

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

    console.log('✅ Calculation result:', {
      currency: result.currency,
      total: result.amounts.totalUser
    });

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