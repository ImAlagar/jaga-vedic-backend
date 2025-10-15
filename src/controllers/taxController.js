import { taxService } from '../services/taxService.js';
import logger from '../utils/logger.js';

export const taxController = {
  // Get tax settings
  async getTaxSettings(req, res) {
    try {
      logger.info('GET /api/tax/settings - Fetching tax settings');
      
      const result = await taxService.getTaxSettings();

      if (!result.success) {
        return res.status(404).json(result);
      }

      res.json(result);
    } catch (error) {
      logger.error('Controller: Error getting tax settings:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while fetching tax settings',
        data: null
      });
    }
  },

  // Calculate tax
  async calculateTax(req, res) {
    try {
      const { items, shippingAddress, subtotal, shippingCost } = req.body;
      
      logger.info('POST /api/tax/calculate - Calculating tax', {
        itemCount: items?.length,
        country: shippingAddress?.country,
        subtotal
      });

      const result = await taxService.calculateTax({
        items,
        shippingAddress,
        subtotal,
        shippingCost
      });

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (error) {
      logger.error('Controller: Error calculating tax:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while calculating tax',
        data: null
      });
    }
  },

  // Update tax settings (Admin only)
  async updateTaxSettings(req, res) {
    try {
      const settingsData = req.body;
      
      logger.info('PUT /api/tax/settings - Updating tax settings', {
        name: settingsData.name,
        taxType: settingsData.taxType
      });

      const result = await taxService.updateTaxSettings(settingsData);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (error) {
      logger.error('Controller: Error updating tax settings:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while updating tax settings',
        data: null
      });
    }
  },

  // Validate tax configuration
  async validateTaxConfiguration(req, res) {
    try {
      logger.info('GET /api/tax/validate - Validating tax configuration');

      const result = await taxService.validateTaxConfiguration();

      res.json(result);
    } catch (error) {
      logger.error('Controller: Error validating tax configuration:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while validating tax configuration',
        data: null
      });
    }
  },

  // Get all country tax rates
  async getCountryTaxRates(req, res) {
    try {
      logger.info('GET /api/tax/countries - Fetching country tax rates');

      const result = await taxService.getCountryTaxRates();

      if (!result.success) {
        return res.status(404).json(result);
      }

      res.json(result);
    } catch (error) {
      logger.error('Controller: Error getting country tax rates:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while fetching country tax rates',
        data: null
      });
    }
  },

  // Get tax rate for specific country
  async getTaxRateForCountry(req, res) {
    try {
      const { countryCode } = req.params;
      
      logger.info(`GET /api/tax/country/${countryCode} - Fetching tax rate`);

      const result = await taxService.getTaxRateForCountry(countryCode);

      if (!result.success) {
        return res.status(404).json(result);
      }

      res.json(result);
    } catch (error) {
      logger.error('Controller: Error getting tax rate for country:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while fetching tax rate',
        data: null
      });
    }
  },

  // Test endpoint
  async testTax(req, res) {
    try {
      logger.info('GET /api/tax/test - Testing tax endpoint');
      
      res.json({
        success: true,
        message: 'Tax API is working correctly',
        data: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          endpoints: [
            'GET /api/tax/settings',
            'POST /api/tax/calculate',
            'PUT /api/tax/settings',
            'GET /api/tax/validate',
            'GET /api/tax/countries',
            'GET /api/tax/country/:countryCode'
          ]
        }
      });
    } catch (error) {
      logger.error('Controller: Error in test endpoint:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error in test endpoint',
        data: null
      });
    }
  }
};