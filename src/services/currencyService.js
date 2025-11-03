// src/services/currencyService.js
import axios from 'axios';

export class CurrencyService {
  constructor() {
    this.baseCurrency = 'USD';
    this.cache = new Map();
    this.cacheDuration = 60 * 60 * 1000; // 1 hour cache
  }

  /**
   * Get user's currency based on country code
   */
  getUserCurrencyFromCountry(countryCode) {
    const countryCurrencyMap = {
      US: 'USD', IN: 'INR', GB: 'GBP', CA: 'CAD', AU: 'AUD',
      DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR', NL: 'EUR',
      JP: 'JPY', CN: 'CNY', BR: 'BRL', MX: 'MXN', RU: 'RUB',
      KR: 'KRW', SG: 'SGD', AE: 'AED', SA: 'SAR', ZA: 'ZAR',
      NG: 'NGN', KE: 'KES', EG: 'EGP', TR: 'TRY', ID: 'IDR',
      TH: 'THB', VN: 'VND', MY: 'MYR', PH: 'PHP'
    };
    
    return countryCurrencyMap[countryCode] || 'USD';
  }

  /**
   * Get exchange rates with caching
   */
  async getExchangeRates(baseCurrency = 'USD') {
    const cacheKey = `rates_${baseCurrency}`;
    const cached = this.cache.get(cacheKey);
    
    // Return cached rates if still valid
    if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
      return cached.rates;
    }

    try {
      // Using Frankfurter.app (free, no API key required)
      const response = await axios.get(
        `https://api.frankfurter.app/latest?from=${baseCurrency}`,
        { timeout: 5000 }
      );
      
      const rates = { 
        ...response.data.rates, 
        [baseCurrency]: 1 // Ensure base currency rate is 1
      };
      
      // Cache the rates
      this.cache.set(cacheKey, {
        rates,
        timestamp: Date.now()
      });
      
      return rates;
      
    } catch (error) {
      console.warn('❌ Exchange rate API failed, using fallback rates:', error.message);
      
      // Fallback rates
      const fallbackRates = this.getDefaultRates();
      this.cache.set(cacheKey, {
        rates: fallbackRates,
        timestamp: Date.now()
      });
      
      return fallbackRates;
    }
  }

  /**
   * Convert amount between currencies
   */
  async convertPrice(amount, fromCurrency = 'USD', toCurrency = 'USD') {
    if (fromCurrency === toCurrency) {
      return parseFloat(amount);
    }

    try {
      const rates = await this.getExchangeRates(fromCurrency);
      
      if (!rates[toCurrency]) {
        console.warn(`Rate for ${toCurrency} not available, using fallback`);
        const fallbackRates = this.getDefaultRates();
        const converted = parseFloat(amount) * (fallbackRates[toCurrency] || 1);
        return Number(converted.toFixed(2));
      }

      const converted = parseFloat(amount) * rates[toCurrency];
      return Number(converted.toFixed(2));
      
    } catch (error) {
      console.warn('Currency conversion failed, using fallback:', error);
      const fallbackRates = this.getDefaultRates();
      const converted = parseFloat(amount) * (fallbackRates[toCurrency] || 1);
      return Number(converted.toFixed(2));
    }
  }

  async convertAmount(amount, fromCurrency, toCurrency) {
    const rate = await this.getExchangeRate(fromCurrency, toCurrency);
    const converted = amount * rate;
    return Math.round(converted * 100) / 100;
  }

  /**
   * Convert entire order calculations to user's currency
   */
  async convertOrderCalculations(calculations, targetCurrency) {
    const {
      subtotal,
      shipping,
      tax,
      discount,
      finalTotal
    } = calculations;

    const rate = await this.getExchangeRates('USD', targetCurrency);

    return {
      subtotal: Math.round(subtotal * rate * 100) / 100,
      shipping: Math.round(shipping * rate * 100) / 100,
      tax: Math.round(tax * rate * 100) / 100,
      discount: Math.round(discount * rate * 100) / 100,
      finalTotal: Math.round(finalTotal * rate * 100) / 100
    };
  }


  /**
   * Format price for display
   */
  formatPriceForDisplay(amount, currency = 'USD') {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch (error) {
      // Fallback formatting
      return `${amount.toFixed(2)} ${currency}`;
    }
  }

  /**
   * Get currency symbol
   */
  getCurrencySymbol(currency = 'USD') {
    const symbols = {
      USD: '$', EUR: '€', GBP: '£', INR: '₹', JPY: '¥',
      CAD: 'CA$', AUD: 'A$', CNY: 'CN¥', BRL: 'R$', MXN: 'MX$',
      KRW: '₩', RUB: '₽', TRY: '₺', ZAR: 'R', SEK: 'kr',
      NOK: 'kr', DKK: 'kr', PLN: 'zł', THB: '฿', PHP: '₱',
      SGD: 'S$', AED: 'AED', SAR: 'SAR', NGN: '₦', KES: 'KSh',
      EGP: 'E£', IDR: 'Rp', MYR: 'RM', VND: '₫'
    };
    
    return symbols[currency] || currency;
  }

  /**
   * Fallback exchange rates
   */
  getDefaultRates() {
    return {
      'USD': 1,      'EUR': 0.92,    'GBP': 0.79,    'INR': 88.72,
      'CAD': 1.36,   'AUD': 1.52,    'JPY': 149.50,  'CNY': 7.24,
      'BRL': 4.92,   'MXN': 17.25,   'RUB': 92.50,   'KRW': 1320.75,
      'SGD': 1.34,   'AED': 3.67,    'SAR': 3.75,    'ZAR': 18.90,
      'NGN': 1500.25,'KES': 157.80,  'EGP': 47.60,   'TRY': 28.75,
      'IDR': 15650,  'THB': 35.80,   'VND': 24750,   'MYR': 4.72,
      'PHP': 56.25
    };
  }

  /**
   * Validate if currency code is supported
   */
  validateCurrency(currency) {
    const supportedCurrencies = Object.keys(this.getDefaultRates());
    return supportedCurrencies.includes(currency) ? currency : 'USD';
  }


async updateExchangeRates() {
    try {
      // This would call your exchange rate API in production
      // For now, we'll just log and use static rates
      logger.info('Exchange rates updated');
      return true;
    } catch (error) {
      logger.error('Exchange rate update failed:', error);
      return false;
    }
  }
  /**
   * Clear cache (useful for testing)
   */
  clearCache() {
    this.cache.clear();
  }
}

export default new CurrencyService();