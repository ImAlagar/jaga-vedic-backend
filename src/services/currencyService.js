// src/services/currencyService.js
import axios from 'axios';

export class CurrencyService {
  constructor() {
    this.apiKey = process.env.EXCHANGE_RATE_API_KEY; // Get from https://exchangerate-api.com/
    this.baseCurrency = 'USD';
  }

  /**
   * Get user's currency based on IP address
   */
  async getUserCurrencyFromIP(ipAddress) {
    try {
      // For development/testing, use a service like ipapi.co
      const response = await axios.get(`http://ipapi.co/${ipAddress}/currency/`, {
        timeout: 5000
      });
      
      const currency = response.data?.trim();
      return this.validateCurrency(currency) || 'USD';
    } catch (error) {
      console.warn('IP-based currency detection failed, using USD as default');
      return 'USD';
    }
  }

  /**
   * Get exchange rates
   */
  async getExchangeRates() {
    try {
      const response = await axios.get(`https://api.exchangerate-api.com/v4/latest/${this.baseCurrency}`);
      return response.data.rates;
    } catch (error) {
      console.warn('Exchange rate API failed, using default rates');
      return this.getDefaultRates();
    }
  }

  /**
   * Convert amount from USD to target currency
   */
  async convertCurrency(amount, fromCurrency = 'USD', toCurrency = 'USD') {
    if (fromCurrency === toCurrency) {
      return parseFloat(amount).toFixed(2);
    }

    try {
      const rates = await this.getExchangeRates();
      const rate = rates[toCurrency] || 1;
      return (parseFloat(amount) * rate).toFixed(2);
    } catch (error) {
      console.warn('Currency conversion failed, returning original amount');
      return parseFloat(amount).toFixed(2);
    }
  }

  /**
   * Validate if currency code is supported
   */
  validateCurrency(currency) {
    const supportedCurrencies = ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD', 'JPY', 'CNY'];
    return supportedCurrencies.includes(currency) ? currency : null;
  }

  /**
   * Fallback exchange rates (update periodically)
   */
  getDefaultRates() {
    return {
      'USD': 1,
      'EUR': 0.85,
      'GBP': 0.73,
      'INR': 83.25,
      'CAD': 1.35,
      'AUD': 1.50,
      'JPY': 150.25,
      'CNY': 7.25
    };
  }
}

export default new CurrencyService();    