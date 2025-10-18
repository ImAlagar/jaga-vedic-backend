// routes/orderCalculation.js
import express from 'express';
import printifyShippingService from '../services/printifyShippingService.js';
import { taxService } from '../services/taxService.js';
import prisma from '../config/prisma.js';
import { couponService } from '../services/couponService.js';

const router = express.Router();

// -----------------------------
// 🧮 UNIFIED CALCULATION ROUTE
// -----------------------------
router.post('/calculate-totals', async (req, res) => {
  try {
    const { items, shippingAddress, couponCode } = req.body;

    if (!items?.length) {
      return res.status(400).json({ 
        success: false, 
        error: 'Items array is required' 
      });
    }

    if (!shippingAddress?.country) {
      return res.status(400).json({ 
        success: false, 
        error: 'Shipping address country required' 
      });
    }

    console.log('🧮 UNIFIED CALCULATION START:', {
      itemsCount: items.length,
      country: shippingAddress.country,
      couponCode: couponCode || 'none'
    });

    // Always use USD for calculations
    const userCurrency = 'USD';
    const exchangeRate = 88; // USD to INR

    // 1. Calculate Subtotal
    const subtotalUSD = items.reduce((sum, item) => {
      const price = parseFloat(item.price) || 0;
      const qty = parseInt(item.quantity) || 1;
      return sum + (price * qty);
    }, 0);

    console.log('💰 Subtotal (USD):', subtotalUSD);

    // 2. Calculate Shipping (EXACTLY like order service)
    let shippingUSD = 0;
    let shippingDetails = null;

    try {
      const shippingItems = items.map(item => ({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity || 1,
        price: parseFloat(item.price)
      }));

      const shippingData = await printifyShippingService.calculateCartShipping(
        shippingItems,
        shippingAddress.country,
        shippingAddress.region
      );

      shippingUSD = shippingData.totalShipping || 0;
      shippingDetails = shippingData;

      // 🔥 Apply same India shipping fix as order service
      if (shippingUSD > 15 && shippingAddress.country === 'IN') {
        console.warn('⚠️ CALCULATION - Shipping cost too high for India, forcing fallback');
        shippingUSD = 5.99;
        shippingDetails = {
          ...shippingDetails,
          totalShipping: 5.99,
          isFree: false,
          hasFallback: true,
          originalShipping: 5.99
        };
      }

    } catch (error) {
      console.error('❌ Shipping API failed, fallback used:', error.message);
      shippingUSD = shippingAddress.country === 'IN' ? 5.99 : 9.99;
    }

    console.log('🚚 Final Shipping (USD):', shippingUSD);

    // 3. Calculate Tax (EXACTLY like order service)
    let taxUSD = 0;
    let taxRate = 0;
    let taxBreakdown = null;

    try {
      const taxData = await taxService.calculateTax({
        items: items.map(item => ({
          productId: item.productId,
          name: item.name || `Product ${item.productId}`,
          price: parseFloat(item.price),
          quantity: item.quantity || 1
        })),
        shippingAddress,
        subtotal: subtotalUSD,
        shippingCost: shippingUSD
      });

      if (taxData.success && taxData.data) {
        taxUSD = taxData.data.taxAmount || 0;
        taxRate = taxData.data.taxRate || 0;
        taxBreakdown = taxData.data.breakdown || null;
        
        console.log(`🧾 TAX CALCULATION: $${taxUSD} at rate ${(taxRate * 100)}%`);
      } else {
        throw new Error('Tax service returned unsuccessful');
      }
    } catch (error) {
      console.error('❌ Tax calculation failed, using fallback:', error.message);
      
      // Use same fallback logic as order service
      try {
        const countryTax = await prisma.countryTaxRate.findFirst({
          where: { 
            countryCode: shippingAddress.country,
            isActive: true 
          }
        });

        if (countryTax) {
          taxRate = countryTax.taxRate / 100;
          const taxableAmount = subtotalUSD + (countryTax.appliesToShipping ? shippingUSD : 0);
          taxUSD = taxableAmount * taxRate;
          console.log(`🧾 DATABASE TAX FALLBACK: $${taxUSD} at rate ${(taxRate * 100)}%`);
        } else {
          taxRate = 0.18; // 18% fallback
          taxUSD = (subtotalUSD + shippingUSD) * taxRate;
          console.log(`🔄 STATIC TAX FALLBACK: $${taxUSD} at rate ${(taxRate * 100)}%`);
        }
      } catch (dbError) {
        console.error('Database tax fallback failed:', dbError);
        taxRate = 0.18;
        taxUSD = (subtotalUSD + shippingUSD) * taxRate;
      }
    }

    // 4. Calculate Discount (EXACTLY like order service)
    let discountAmount = 0;
    let finalCouponCode = null;
    let couponDetails = null;

    if (couponCode && couponCode.trim() !== '') {
      try {
        const couponValidation = await couponService.validateCoupon(
          couponCode.trim(),
          req.user?.id, // Optional user ID
          items.map(item => ({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity || 1,
            price: parseFloat(item.price),
            product: { id: item.productId } // Mock product object
          })),
          subtotalUSD
        );

        if (couponValidation.isValid) {
          discountAmount = couponValidation.coupon.discountAmount;
          finalCouponCode = couponValidation.coupon.code;
          couponDetails = couponValidation.coupon;
          console.log(`🎫 COUPON APPLIED: -$${discountAmount} (${finalCouponCode})`);
        } else {
          console.warn('❌ Coupon validation failed:', couponValidation.error);
        }
      } catch (error) {
        console.error('Coupon processing failed:', error);
        // Proceed without coupon (same as order service)
      }
    }

    // 5. Calculate Final Totals (EXACTLY like order service)
    let finalAmountUSD = subtotalUSD + shippingUSD + taxUSD - discountAmount;
    finalAmountUSD = Math.max(0.01, finalAmountUSD);

    // Convert to display currency
    const userCountry = shippingAddress?.country || 'US';
    const displayCurrency = userCountry === 'IN' ? 'INR' : 'USD';
    const finalAmountDisplay = userCountry === 'IN' 
      ? finalAmountUSD * exchangeRate 
      : finalAmountUSD;

    console.log('💰 FINAL CALCULATIONS:', {
      subtotal: subtotalUSD,
      shipping: shippingUSD,
      tax: taxUSD,
      discount: discountAmount,
      finalUSD: finalAmountUSD,
      finalDisplay: finalAmountDisplay,
      currency: displayCurrency,
      exchangeRate: userCountry === 'IN' ? exchangeRate : 1
    });

    // ✅ ADD ROUNDING FUNCTIONS
    const roundToWholeNumber = (amount) => Math.round(amount);
    const roundUSDToWhole = (amount) => Math.round(amount * 100) / 100; // Keep USD with 2 decimals for calculations

    // 6. Prepare Response (Same structure frontend expects) - WITH ROUNDING
    const response = {
      success: true,
      currency: displayCurrency,
      exchangeRate: userCountry === 'IN' ? exchangeRate : 1,
      amounts: {
        // USD amounts keep 2 decimals for accurate calculations
        subtotalUSD: +roundUSDToWhole(subtotalUSD).toFixed(2),
        shippingUSD: +roundUSDToWhole(shippingUSD).toFixed(2),
        taxUSD: +roundUSDToWhole(taxUSD).toFixed(2),
        totalUSD: +roundUSDToWhole(finalAmountUSD).toFixed(2),
        // User display amounts - ROUNDED TO WHOLE NUMBERS
        subtotalUser: userCountry === 'IN' ? roundToWholeNumber(subtotalUSD * exchangeRate) : roundToWholeNumber(subtotalUSD),
        shippingUser: userCountry === 'IN' ? roundToWholeNumber(shippingUSD * exchangeRate) : roundToWholeNumber(shippingUSD),
        taxUser: userCountry === 'IN' ? roundToWholeNumber(taxUSD * exchangeRate) : roundToWholeNumber(taxUSD),
        totalUser: roundToWholeNumber(finalAmountDisplay)
      },
      breakdown: {
        subtotal: +roundUSDToWhole(subtotalUSD).toFixed(2),
        shipping: +roundUSDToWhole(shippingUSD).toFixed(2),
        tax: +roundUSDToWhole(taxUSD).toFixed(2),
        taxRate: +(taxRate * 100).toFixed(2),
        discount: +roundUSDToWhole(discountAmount).toFixed(2),
        total: +roundUSDToWhole(finalAmountUSD).toFixed(2),
        totalDisplay: roundToWholeNumber(finalAmountDisplay)
      },
      shippingDetails: {
        method: shippingDetails?.methodName || 'standard',
        isFree: shippingDetails?.isFree || false,
        originalShipping: shippingDetails?.originalShipping || shippingUSD,
        hasFallback: shippingDetails?.hasFallback || false
      },
      couponDetails: couponDetails ? {
        code: finalCouponCode,
        discountAmount: roundToWholeNumber(discountAmount),
        isValid: true
      } : null,
      // For debugging - compare with order service
      debug: {
        calculationMethod: 'UNIFIED_CALCULATION_API',
        userCountry: userCountry,
        displayCurrency: displayCurrency,
        expectedOrderAmount: roundToWholeNumber(finalAmountDisplay)
      }
    };

    console.log('✅ UNIFIED CALCULATION COMPLETE:', {
      totalDisplay: response.amounts.totalUser,
      currency: response.currency,
      roundedAmounts: {
        subtotalUser: response.amounts.subtotalUser,
        shippingUser: response.amounts.shippingUser,
        taxUser: response.amounts.taxUser,
        totalUser: response.amounts.totalUser
      }
    });

    res.json(response);

  } catch (error) {
    console.error('❌ UNIFIED CALCULATION ERROR:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      debug: {
        calculationMethod: 'UNIFIED_CALCULATION_API',
        error: error.message
      }
    });
  }
});

export default router;