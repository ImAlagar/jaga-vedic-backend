// src/services/shippingService.js
import prisma from "../config/prisma.js";
import logger from "../utils/logger.js";
import { PrintifyService } from "./printifyService.js";

export class ShippingService {
  constructor() {
    this.printifyService = new PrintifyService();
  }

  async calculateShippingCost(items, shippingAddress) {
    try {
      const { country, region, city, zipCode } = shippingAddress;

      if (!country) {
        return {
          success: false,
          message: 'Country is required for shipping calculation'
        };
      }

      let totalShippingCost = 0;
      const shippingBreakdown = [];

      // Calculate shipping for each item
      for (const item of items) {
        const product = await prisma.product.findUnique({
          where: { id: item.productId }
        });

        if (!product) {
          throw new Error(`Product ${item.productId} not found`);
        }

        // Get shipping cost from Printify API
        const shippingCost = await this.getPrintifyShippingCost(
          product.printifyProductId,
          item.variantId,
          country,
          region,
          zipCode
        );

        const itemShippingCost = shippingCost * item.quantity;
        totalShippingCost += itemShippingCost;

        shippingBreakdown.push({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          shippingCost: itemShippingCost,
          perItemCost: shippingCost
        });
      }

      // Apply shipping rules
      totalShippingCost = this.applyShippingRules(totalShippingCost, items);

      return {
        success: true,
        data: {
          shippingCost: Math.round(totalShippingCost * 100) / 100,
          breakdown: shippingBreakdown,
          currency: 'USD'
        }
      };

    } catch (error) {
      logger.error(`Shipping calculation failed: ${error.message}`);
      return {
        success: false,
        message: error.message
      };
    }
  }

  async getPrintifyShippingCost(productId, variantId, country, region, zipCode) {
    try {
      // Try to get from cache first
      const cachedShipping = await prisma.printifyShippingCache.findFirst({
        where: {
          productId: parseInt(productId),
          variantId: parseInt(variantId),
          country,
          region: region || null,
          expiresAt: { gt: new Date() }
        },
        orderBy: { cachedAt: 'desc' }
      });

      if (cachedShipping) {
        return cachedShipping.shippingCost;
      }

      // Fetch from Printify API
      const shippingInfo = await this.printifyService.getShippingCost(
        productId,
        variantId,
        country,
        region,
        zipCode
      );

      if (!shippingInfo || !shippingInfo.shippingCost) {
        // Return default shipping cost if API fails
        return this.getDefaultShippingCost(country);
      }

      const shippingCost = shippingInfo.shippingCost;

      // Cache the result
      await prisma.printifyShippingCache.create({
        data: {
          productId: parseInt(productId),
          variantId: parseInt(variantId),
          country,
          region: region || null,
          shippingCost,
          shippingMethod: shippingInfo.shippingMethod || 1,
          estimatedDays: shippingInfo.estimatedDays || {},
          isAvailable: true,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // Cache for 24 hours
        }
      });

      return shippingCost;

    } catch (error) {
      logger.error(`Printify shipping cost fetch failed: ${error.message}`);
      return this.getDefaultShippingCost(country);
    }
  }

  getDefaultShippingCost(country) {
    // Default shipping costs based on country/region
    const shippingRates = {
      'US': 5.99, 'CA': 8.99, 'GB': 6.99, 'DE': 7.99, 'FR': 7.99,
      'AU': 12.99, 'IN': 3.99, 'JP': 9.99, 'SG': 8.99
    };

    return shippingRates[country] || 9.99; // Default international shipping
  }

  applyShippingRules(baseShippingCost, items) {
    let finalShippingCost = baseShippingCost;

    // Free shipping for orders over $100
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    if (subtotal >= 100) {
      finalShippingCost = 0;
    }

    // Bulk discount - reduced shipping for multiple items
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    if (totalItems > 5) {
      finalShippingCost = Math.max(0, finalShippingCost * 0.8); // 20% discount
    }

    return Math.round(finalShippingCost * 100) / 100;
  }
}

export const shippingService = new ShippingService();