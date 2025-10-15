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
  async calculateOrderTax(orderData) {
    try {
      const {
        items,
        shippingAddress,
        subtotal,
        shippingCost = 0
      } = orderData;

      const taxSettings = await this.getActiveTaxSettings();
      
      if (!taxSettings) {
        return {
          taxAmount: 0,
          breakdown: [],
          total: subtotal + shippingCost,
          taxIncluded: false
        };
      }

      const countryCode = shippingAddress?.country || 'US';
      const countryTaxRate = taxSettings.countryTaxRates.find(
        rate => rate.countryCode === countryCode
      );

      if (!countryTaxRate || countryTaxRate.taxRate === 0) {
        return {
          taxAmount: 0,
          breakdown: [],
          total: subtotal + shippingCost,
          taxIncluded: taxSettings.inclusionType === 'INCLUSIVE'
        };
      }

      // Calculate taxable amount
      let taxableAmount = subtotal;
      
      // Apply product-specific tax overrides
      const itemBreakdown = [];
      let totalTaxAmount = 0;

      for (const item of items) {
        const productOverride = taxSettings.productTaxOverrides.find(
          override => override.productId === item.productId
        );

        if (productOverride?.isTaxExempt) {
          continue; // Skip tax-exempt items
        }

        const itemTaxRate = productOverride?.taxRate ?? countryTaxRate.taxRate;
        const itemTaxableAmount = item.price * item.quantity;
        const itemTaxAmount = (itemTaxableAmount * itemTaxRate) / 100;

        itemBreakdown.push({
          productId: item.productId,
          productName: item.name,
          rate: itemTaxRate,
          amount: itemTaxAmount,
          taxableAmount: itemTaxableAmount
        });

        totalTaxAmount += itemTaxAmount;
      }

      // Add shipping tax if applicable
      let shippingTaxAmount = 0;
      if (countryTaxRate.appliesToShipping) {
        shippingTaxAmount = (shippingCost * countryTaxRate.taxRate) / 100;
        totalTaxAmount += shippingTaxAmount;
      }

      const breakdown = [
        {
          name: `${countryTaxRate.countryName} ${taxSettings.taxType}`,
          rate: countryTaxRate.taxRate,
          amount: totalTaxAmount,
          appliesToShipping: countryTaxRate.appliesToShipping,
          itemBreakdown,
          shippingTaxAmount
        }
      ];

      const finalTotal = taxSettings.inclusionType === 'INCLUSIVE' 
        ? subtotal + shippingCost // Tax already included in prices
        : subtotal + shippingCost + totalTaxAmount;

      return {
        taxAmount: totalTaxAmount,
        breakdown,
        total: finalTotal,
        taxIncluded: taxSettings.inclusionType === 'INCLUSIVE'
      };
    } catch (error) {
      logger.error('Error calculating tax:', error);
      throw new Error('Failed to calculate tax');
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