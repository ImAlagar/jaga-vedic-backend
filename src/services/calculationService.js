// src/services/calculationService.js
import currencyService from './currencyService.js';

export class CalculationService {
  async calculateCartTotals(cartItems, shippingAddress, couponCode = '') {
    try {
      // 1. Calculate in base currency (USD)
      const baseCalculations = await this.calculateBaseTotals(cartItems, shippingAddress, couponCode);
      
      // 2. Get user's preferred currency
      const userCurrency = currencyService.getUserCurrencyFromCountry(shippingAddress.country);
      
      // 3. Convert all amounts to user's currency
      const userCalculations = await currencyService.convertOrderCalculations(baseCalculations, userCurrency);
      
      return {
        success: true,
        currency: userCurrency,
        amounts: {
          // Base currency amounts (USD)
          subtotalBase: baseCalculations.subtotal,
          shippingBase: baseCalculations.shipping,
          taxBase: baseCalculations.tax,
          discountBase: baseCalculations.discount,
          totalBase: baseCalculations.finalTotal,
          
          // User currency amounts
          subtotalUser: userCalculations.subtotal,
          shippingUser: userCalculations.shipping,
          taxUser: userCalculations.tax,
          discountUser: userCalculations.discount,
          totalUser: userCalculations.finalTotal
        },
        breakdown: {
          taxRate: baseCalculations.taxRate,
          discount: baseCalculations.discount,
          currency: userCurrency,
          country: shippingAddress.country
        }
      };
      
    } catch (error) {
      console.error('❌ Calculation error:', error);
      return {
        success: false,
        message: 'Failed to calculate totals',
        error: error.message
      };
    }
  }

  async calculateBaseTotals(cartItems, shippingAddress, couponCode) {
    // Calculate subtotal in USD
    const subtotal = cartItems.reduce((sum, item) => {
      return sum + (parseFloat(item.price) * parseInt(item.quantity));
    }, 0);

    // Calculate shipping (in USD)
    const shipping = await this.calculateShipping(subtotal, shippingAddress);
    
    // Calculate tax (in USD)
    const taxRate = await this.getTaxRate(shippingAddress);
    const tax = subtotal * (taxRate / 100);
    
    // Apply coupon discount (in USD)
    const discount = await this.applyCouponDiscount(subtotal, couponCode, cartItems);
    
    const finalTotal = subtotal + shipping + tax - discount;
    
    return {
      subtotal: Number(subtotal.toFixed(2)),
      shipping: Number(shipping.toFixed(2)),
      tax: Number(tax.toFixed(2)),
      discount: Number(discount.toFixed(2)),
      finalTotal: Number(finalTotal.toFixed(2)),
      taxRate: Number(taxRate.toFixed(2))
    };
  }

  async calculateShipping(subtotal, address) {
    // Your existing shipping logic here
    // Example: Free shipping over $100, otherwise $10
    if (subtotal >= 100) {
      return 0;
    }
    return 10.00;
  }

  async getTaxRate(address) {
    // Your existing tax logic here
    // Example: Different tax rates by country
    const taxRates = {
      'US': 8.5, 'IN': 18, 'GB': 20, 'CA': 13, 'AU': 10,
      'DE': 19, 'FR': 20, 'IT': 22, 'ES': 21, 'NL': 21,
      'JP': 10, 'CN': 13, 'BR': 17, 'MX': 16
    };
    
    return taxRates[address.country] || 10; // Default 10%
  }

  async applyCouponDiscount(subtotal, couponCode, cartItems) {
    if (!couponCode) return 0;
    
    // Your existing coupon logic here
    // Example: 10% discount for "WELCOME10"
    if (couponCode === 'WELCOME10') {
      return subtotal * 0.1;
    }
    
    return 0;
  }
}

export default new CalculationService();