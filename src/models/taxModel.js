import prisma from '../config/prisma.js';
import logger from '../utils/logger.js';

export const taxModel = {
  // Get active tax settings with country rates
  async getActiveTaxSettings() {
    try {
      return await prisma.taxSetting.findFirst({
        where: { isActive: true },
        include: {
          countryTaxRates: {
            where: { isActive: true },
            orderBy: { priority: 'desc' }
          },
          productTaxOverrides: true
        }
      });
    } catch (error) {
      logger.error('Error fetching tax settings:', error);
      throw new Error('Failed to fetch tax settings');
    }
  },

  // Get tax rate for specific country
  async getCountryTaxRate(countryCode) {
    try {
      const taxSettings = await this.getActiveTaxSettings();
      if (!taxSettings) return null;

      return taxSettings.countryTaxRates.find(
        rate => rate.countryCode === countryCode
      );
    } catch (error) {
      logger.error('Error fetching country tax rate:', error);
      throw new Error('Failed to fetch country tax rate');
    }
  },

  // Update tax settings
  async updateTaxSettings(settingsData) {
    try {
      const { countryRates, productOverrides, ...taxSettings } = settingsData;

      return await prisma.$transaction(async (tx) => {
        // Find or create active tax setting
        let taxSetting = await tx.taxSetting.findFirst({
          where: { isActive: true }
        });

        if (taxSetting) {
          taxSetting = await tx.taxSetting.update({
            where: { id: taxSetting.id },
            data: taxSettings
          });
        } else {
          taxSetting = await tx.taxSetting.create({
            data: {
              ...taxSettings,
              isActive: true
            }
          });
        }

        // Update country tax rates
        if (countryRates && countryRates.length > 0) {
          await tx.countryTaxRate.deleteMany({
            where: { taxSettingId: taxSetting.id }
          });

          for (const rate of countryRates) {
            await tx.countryTaxRate.create({
              data: {
                ...rate,
                taxSettingId: taxSetting.id
              }
            });
          }
        }

        // Update product tax overrides
        if (productOverrides && productOverrides.length > 0) {
          await tx.productTaxOverride.deleteMany({
            where: { taxSettingId: taxSetting.id }
          });

          for (const override of productOverrides) {
            await tx.productTaxOverride.create({
              data: {
                ...override,
                taxSettingId: taxSetting.id
              }
            });
          }
        }

        return this.getActiveTaxSettings();
      });
    } catch (error) {
      logger.error('Error updating tax settings:', error);
      throw new Error('Failed to update tax settings');
    }
  },

  // Calculate tax for order
async calculateOrderTax(data) {
  try {
    console.log('🔍 TAX MODEL - Calculating tax for:', {
      country: data.shippingAddress.country,
      subtotal: data.subtotal,
      shippingCost: data.shippingCost
    });

    // Country tax rate get pannu
    const countryTax = await prisma.countryTaxRate.findFirst({
      where: { 
        countryCode: data.shippingAddress.country,
        isActive: true 
      }
    });

    console.log('🔍 TAX MODEL - Found tax rate:', countryTax);

    if (!countryTax) {
      console.log('❌ TAX MODEL - No tax rate found for country:', data.shippingAddress.country);
      return {
        taxAmount: 0,
        taxRate: 0,
        breakdown: []
      };
    }

    // 🔥 CRITICAL FIX: Correct decimal conversion
    const taxRate = countryTax.taxRate / 100; // 20 / 100 = 0.20 ✅
    const taxableAmount = data.subtotal + (countryTax.appliesToShipping ? data.shippingCost : 0);
    const taxAmount = taxableAmount * taxRate;

    console.log('💰 TAX MODEL - CORRECTED CALCULATION:', {
      databaseTaxRate: countryTax.taxRate,
      decimalTaxRate: taxRate,
      taxableAmount: taxableAmount,
      calculatedTax: taxAmount,
      expectedTax: `$${taxAmount} at ${countryTax.taxRate}%`
    });

    return {
      taxAmount: taxAmount,
      taxRate: taxRate, // Return as decimal (0.2 for 20%)
      breakdown: [
        {
          name: `${countryTax.countryName} Tax`,
          rate: taxRate,
          amount: taxAmount,
          appliesToShipping: countryTax.appliesToShipping,
          taxableAmount: taxableAmount
        }
      ]
    };
  } catch (error) {
    console.error('TAX MODEL - Error:', error);
    throw error;
  }
},

  // Validate tax configuration
  async validateTaxConfiguration() {
    try {
      const taxSettings = await this.getActiveTaxSettings();
      
      if (!taxSettings) {
        return { 
          isValid: false, 
          message: 'No active tax configuration found',
          errors: ['No tax settings configured']
        };
      }

      const errors = [];

      if (taxSettings.countryTaxRates.length === 0) {
        errors.push('No country tax rates configured');
      }

      // Check for duplicate country codes
      const countryCodes = taxSettings.countryTaxRates.map(rate => rate.countryCode);
      const duplicateCountries = countryCodes.filter((code, index) => 
        countryCodes.indexOf(code) !== index
      );
      
      if (duplicateCountries.length > 0) {
        errors.push(`Duplicate tax rates for countries: ${duplicateCountries.join(', ')}`);
      }

      return {
        isValid: errors.length === 0,
        message: errors.length === 0 ? 'Tax configuration is valid' : 'Tax configuration has issues',
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error) {
      logger.error('Error validating tax configuration:', error);
      throw new Error('Failed to validate tax configuration');
    }
  },

  // Get tax rates for all countries
  async getAllCountryTaxRates() {
    try {
      const taxSettings = await this.getActiveTaxSettings();
      return taxSettings?.countryTaxRates || [];
    } catch (error) {
      logger.error('Error fetching all country tax rates:', error);
      throw new Error('Failed to fetch country tax rates');
    }
  }
};