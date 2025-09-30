// src/models/currencyModel.js
import prisma from "../config/prisma.js";
import { SUPPORTED_CURRENCIES } from "../config/currencyConfig.js";

export async function findCurrencyByCode(code) {
  try {
    return await prisma.currency.findUnique({
      where: { code: code.toUpperCase() }
    });
  } catch (error) {
    console.error("Error finding currency by code:", error);
    throw new Error("Database error occurred");
  }
}

export async function findAllCurrencies() {
  try {
    return await prisma.currency.findMany({
      where: { isActive: true },
      orderBy: { code: 'asc' }
    });
  } catch (error) {
    console.error("Error finding all currencies:", error);
    throw new Error("Database error occurred");
  }
}

export async function createCurrency(data) {
  try {
    return await prisma.currency.create({
      data: {
        ...data,
        code: data.code.toUpperCase()
      }
    });
  } catch (error) {
    console.error("Error creating currency:", error);
    throw new Error("Failed to create currency");
  }
}

export async function updateCurrencyRates(rates) {
  try {
    const updates = Object.entries(rates).map(([code, rate]) => 
      prisma.currency.updateMany({
        where: { code: code.toUpperCase() },
        data: { rate, lastUpdated: new Date() }
      })
    );
    
    await Promise.all(updates);
    return { success: true, updated: updates.length };
  } catch (error) {
    console.error("Error updating currency rates:", error);
    throw new Error("Failed to update currency rates");
  }
}

export async function createCurrencyUpdateLog(data) {
  try {
    return await prisma.currencyUpdateLog.create({
      data: {
        base: data.base || 'USD',
        ratesCount: data.ratesCount || 0,
        success: data.success,
        error: data.error || null,
        source: data.source || null,
        createdAt: new Date()
      }
    });
  } catch (error) {
    console.error("Error creating currency update log:", error);
    throw new Error("Failed to log currency update");
  }
}

export async function initializeCurrencies() {
  try {
    console.log("🔄 Initializing currencies in database...");
    
    for (const currency of SUPPORTED_CURRENCIES) {
      await prisma.currency.upsert({
        where: { code: currency.code },
        update: { 
          name: currency.name,
          symbol: currency.symbol,
          locale: currency.locale,
          isActive: true 
        },
        create: { 
          ...currency, 
          rate: 1.0,
          countryCodes: []
        }
      });
    }
    
    console.log("✅ Currencies initialized successfully");
    return { success: true, count: SUPPORTED_CURRENCIES.length };
  } catch (error) {
    console.error("❌ Error initializing currencies:", error);
    throw new Error(`Failed to initialize currencies: ${error.message}`);
  }
}

// Helper function to check if currencies table has data
export async function checkCurrenciesExist() {
  try {
    const count = await prisma.currency.count();
    return count > 0;
  } catch (error) {
    console.error("Error checking currencies:", error);
    return false;
  }
}