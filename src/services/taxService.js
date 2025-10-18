import { taxModel } from '../models/taxModel.js';
import logger from '../utils/logger.js';

export const taxService = {
  // Get tax settings
  async getTaxSettings() {
    try {
      const settings = await taxModel.getActiveTaxSettings();
      
      if (!settings) {
        return {
          success: false,
          message: 'No tax configuration found',
          data: null
        };
      }

      return {
        success: true,
        message: 'Tax settings retrieved successfully',
        data: settings
      };
    } catch (error) {
      logger.error('Service: Error getting tax settings:', error);
      return {
        success: false,
        message: error.message || 'Failed to get tax settings',
        data: null
      };
    }
  },

  // Calculate tax
async calculateTax(calculationData) {
  try {
    const { items, shippingAddress, subtotal, shippingCost } = calculationData;

    console.log('🔍 TAX SERVICE - Input data:', {
      country: shippingAddress?.country,
      region: shippingAddress?.region,
      subtotal: subtotal,
      shippingCost: shippingCost,
      itemsCount: items.length,
      items: items.map(item => ({
        productId: item.productId,
        price: item.price,
        quantity: item.quantity
      }))
    });

    // Validate required fields
    if (!items || !Array.isArray(items) || items.length === 0) {
      return {
        success: false,
        message: 'Items array is required and cannot be empty',
        data: null
      };
    }

    if (!shippingAddress || !shippingAddress.country) {
      return {
        success: false,
        message: 'Shipping address with country is required',
        data: null
      };
    }

    const taxCalculation = await taxModel.calculateOrderTax({
      items,
      shippingAddress,
      subtotal: parseFloat(subtotal) || 0,
      shippingCost: parseFloat(shippingCost) || 0
    });

    console.log('💰 TAX SERVICE - Calculation result:', {
      taxAmount: taxCalculation.taxAmount,
      taxRate: taxCalculation.taxRate,
      breakdown: taxCalculation.breakdown
    });

    return {
      success: true,
      message: 'Tax calculated successfully',
      data: taxCalculation
    };
  } catch (error) {
    logger.error('Service: Error calculating tax:', error);
    return {
      success: false,
      message: error.message || 'Failed to calculate tax',
      data: null
    };
  }
},

  // Update tax settings
  async updateTaxSettings(settingsData) {
    try {
      const { name, taxType, calculationType, inclusionType, defaultRate, countryRates } = settingsData;

      // Validate required fields
      if (!name || !taxType || !calculationType || !inclusionType) {
        return {
          success: false,
          message: 'Missing required fields: name, taxType, calculationType, inclusionType',
          data: null
        };
      }

      if (defaultRate < 0 || defaultRate > 100) {
        return {
          success: false,
          message: 'Default tax rate must be between 0 and 100',
          data: null
        };
      }

      // Validate country rates
      if (countryRates && Array.isArray(countryRates)) {
        for (const rate of countryRates) {
          if (!rate.countryCode || !rate.countryName) {
            return {
              success: false,
              message: 'Country code and name are required for each tax rate',
              data: null
            };
          }

          if (rate.taxRate < 0 || rate.taxRate > 100) {
            return {
              success: false,
              message: `Tax rate for ${rate.countryName} must be between 0 and 100`,
              data: null
            };
          }
        }
      }

      const updatedSettings = await taxModel.updateTaxSettings(settingsData);

      return {
        success: true,
        message: 'Tax settings updated successfully',
        data: updatedSettings
      };
    } catch (error) {
      logger.error('Service: Error updating tax settings:', error);
      return {
        success: false,
        message: error.message || 'Failed to update tax settings',
        data: null
      };
    }
  },

  // Validate tax configuration
  async validateTaxConfiguration() {
    try {
      const validation = await taxModel.validateTaxConfiguration();
      
      return {
        success: true,
        message: validation.message,
        data: validation
      };
    } catch (error) {
      logger.error('Service: Error validating tax configuration:', error);
      return {
        success: false,
        message: error.message || 'Failed to validate tax configuration',
        data: null
      };
    }
  },

  // Get country tax rates
  async getCountryTaxRates() {
    try {
      const rates = await taxModel.getAllCountryTaxRates();
      
      return {
        success: true,
        message: 'Country tax rates retrieved successfully',
        data: rates
      };
    } catch (error) {
      logger.error('Service: Error getting country tax rates:', error);
      return {
        success: false,
        message: error.message || 'Failed to get country tax rates',
        data: null
      };
    }
  },

  // Get tax rate for specific country
  async getTaxRateForCountry(countryCode) {
    try {
      if (!countryCode) {
        return {
          success: false,
          message: 'Country code is required',
          data: null
        };
      }

      const rate = await taxModel.getCountryTaxRate(countryCode);
      
      if (!rate) {
        return {
          success: false,
          message: `No tax rate found for country: ${countryCode}`,
          data: null
        };
      }

      return {
        success: true,
        message: 'Tax rate retrieved successfully',
        data: rate
      };
    } catch (error) {
      logger.error('Service: Error getting tax rate for country:', error);
      return {
        success: false,
        message: error.message || 'Failed to get tax rate',
        data: null
      };
    }
  }
};