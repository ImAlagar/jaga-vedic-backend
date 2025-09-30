// src/services/currencyService.js
import * as currencyModel from "../models/currencyModel.js";
import { SUPPORTED_CURRENCIES, COUNTRY_CURRENCY_MAP, CURRENCY_CONFIG } from "../config/currencyConfig.js";

export class CurrencyService {
  constructor() {
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    
    try {
      // Check if currencies exist in database
      const currenciesExist = await currencyModel.checkCurrenciesExist();
      
      if (!currenciesExist) {
        console.log("🔄 No currencies found in database, initializing...");
        await currencyModel.initializeCurrencies();
      } else {
        console.log("✅ Currencies already initialized in database");
      }
      
      this.initialized = true;
    } catch (error) {
      console.error("❌ Currency service initialization failed:", error);
      throw error;
    }
  }

  async getAllCurrencies() {
    try {
      await this.initialize();
      const currencies = await currencyModel.findAllCurrencies();
      
      // If no currencies found, try to initialize again
      if (!currencies || currencies.length === 0) {
        console.log("🔄 No currencies found, re-initializing...");
        await currencyModel.initializeCurrencies();
        return await currencyModel.findAllCurrencies();
      }
      
      return currencies;
    } catch (error) {
      console.error("❌ Error getting all currencies:", error);
      throw new Error(`Failed to get currencies: ${error.message}`);
    }
  }

  async getExchangeRates() {
    try {
      await this.initialize();
      const currencies = await currencyModel.findAllCurrencies();
      
      const rates = {};
      currencies.forEach(currency => {
        rates[currency.code] = currency.rate;
      });
      
      return {
        base: 'USD',
        rates,
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error("❌ Error getting exchange rates:", error);
      throw new Error(`Failed to get exchange rates: ${error.message}`);
    }
  }

  async detectUserCurrency(req) {
    try {
      // Check for saved preference
      const savedCurrency = req.cookies?.preferredCurrency;
      if (savedCurrency) {
        const currency = await currencyModel.findCurrencyByCode(savedCurrency);
        if (currency) return currency;
      }

      // Detect from headers
      const acceptLanguage = req.headers['accept-language'];
      const browserLocale = acceptLanguage?.split(',')[0] || 'en-US';
      const countryCode = browserLocale.split('-')[1];

      // Use comprehensive country mapping
      const detectedCode = COUNTRY_CURRENCY_MAP[countryCode] || 'USD';
      const currency = await currencyModel.findCurrencyByCode(detectedCode);
      
      return currency || await currencyModel.findCurrencyByCode('USD');
      
    } catch (error) {
      console.error("Currency detection failed:", error);
      return await currencyModel.findCurrencyByCode('USD');
    }
  }

  async fetchRatesFromAPI(apiUrl) {
    try {
      console.log(`🔄 Trying API: ${apiUrl}`);
      
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(apiUrl, {
        signal: controller.signal
      });
      
      clearTimeout(timeout);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      // Handle different API response formats
      if (apiUrl.includes('exchangerate.host')) {
        if (data.success === false) throw new Error(data.error?.info || 'API error');
        return data.rates;
      } else if (apiUrl.includes('open.er-api.com')) {
        if (data.result !== 'success') throw new Error('API returned error');
        return data.rates;
      } else if (apiUrl.includes('fawazahmed0')) {
        // This API returns { usd: { eur: 0.85, gbp: 0.73, ... } }
        if (!data.usd || typeof data.usd !== 'object') {
          throw new Error('Invalid response format');
        }
        
        // Convert { usd: { eur: 0.85 } } to { EUR: 0.85 }
        const convertedRates = {};
        for (const [key, value] of Object.entries(data.usd)) {
          convertedRates[key.toUpperCase()] = value;
        }
        return convertedRates;
      } else {
        return data.rates || data;
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log(`❌ API timeout: ${apiUrl}`);
        throw new Error('Request timeout');
      }
      console.log(`❌ API failed: ${apiUrl} - ${error.message}`);
      throw error;
    }
  }

  async updateExchangeRates() {
    let lastError = null;
    
    for (const apiUrl of CURRENCY_CONFIG.exchangeRateAPIs) {
      try {
        console.log(`🔄 Attempting to update rates from: ${apiUrl}`);
        
        const rates = await this.fetchRatesFromAPI(apiUrl);
        
        if (!rates || typeof rates !== 'object') {
          throw new Error('Invalid rates data received');
        }

        console.log('📊 Raw rates received:', Object.keys(rates).length, 'currencies');

        // Get all supported currency codes
        const supportedCurrencyCodes = SUPPORTED_CURRENCIES.map(c => c.code);
        
        // Filter only supported currencies and validate rates
        const supportedRates = {};
        let validRatesCount = 0;
        
        supportedCurrencyCodes.forEach(currencyCode => {
          const rate = rates[currencyCode];
          if (rate !== undefined && rate !== null && !isNaN(rate) && rate > 0) {
            supportedRates[currencyCode] = parseFloat(rate);
            validRatesCount++;
          }
        });

        console.log('✅ Valid supported rates:', validRatesCount);

        if (validRatesCount < 20) { // Require at least 20 valid rates
          throw new Error(`Insufficient valid rates: ${validRatesCount}`);
        }

        // Update rates in database
        await currencyModel.updateCurrencyRates(supportedRates);
        
        // Log successful update
        await currencyModel.createCurrencyUpdateLog({
          base: CURRENCY_CONFIG.baseCurrency,
          ratesCount: validRatesCount,
          success: true,
          source: apiUrl
        });

        console.log("✅ Exchange rates updated successfully from:", apiUrl);
        return { 
          success: true, 
          rates: supportedRates, 
          source: apiUrl,
          ratesCount: validRatesCount
        };
        
      } catch (error) {
        lastError = error;
        console.log(`❌ Failed with API: ${apiUrl} - ${error.message}`);
        continue;
      }
    }

    // All APIs failed, use fallback rates
    console.log("⚠️ All APIs failed, using fallback rates");
    
    try {
      await currencyModel.updateCurrencyRates(CURRENCY_CONFIG.fallbackRates);
      
      await currencyModel.createCurrencyUpdateLog({
        base: CURRENCY_CONFIG.baseCurrency,
        ratesCount: Object.keys(CURRENCY_CONFIG.fallbackRates).length,
        success: false,
        error: `All APIs failed: ${lastError?.message}`,
        source: 'fallback'
      });

      return { 
        success: true, 
        rates: CURRENCY_CONFIG.fallbackRates, 
        source: 'fallback',
        note: 'Using fallback rates due to API failures'
      };
    } catch (logError) {
      console.error("❌ Even fallback failed:", logError.message);
      return { 
        success: true, 
        rates: CURRENCY_CONFIG.fallbackRates, 
        source: 'fallback',
        note: 'Using fallback rates (log failed)'
      };
    }
  }

  async convertPrice(price, fromCurrency, toCurrency) {
    if (fromCurrency === toCurrency) return price;

    const from = await currencyModel.findCurrencyByCode(fromCurrency);
    const to = await currencyModel.findCurrencyByCode(toCurrency);

    if (!from || !to) {
      throw new Error("Invalid currency code");
    }

    // Convert through base currency (USD)
    const priceInUSD = price / from.rate;
    return priceInUSD * to.rate;
  }

  async formatPrice(price, currencyCode) {
    const currency = await currencyModel.findCurrencyByCode(currencyCode);
    if (!currency) {
      return `$${price.toFixed(2)}`;
    }

    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(price);
    } catch (error) {
      // Fallback formatting
      return `${currency.symbol}${price.toFixed(2)}`;
    }
  }

  // Method to manually set rates (useful for testing)
  async setManualRates(rates) {
    try {
      await currencyModel.updateCurrencyRates(rates);
      console.log("✅ Manual rates set successfully");
      return { success: true, rates };
    } catch (error) {
      console.error("❌ Failed to set manual rates:", error);
      throw error;
    }
  }
}

// Export singleton instance
export const currencyService = new CurrencyService();