// src/scripts/initWorldwideCurrencies.js
import { PrismaClient } from '@prisma/client';
import { SUPPORTED_CURRENCIES } from '../config/currencyConfig.js';

const prisma = new PrismaClient();

async function initializeWorldwideCurrencies() {
  try {
    console.log('🔄 Initializing worldwide currencies...');
    let successCount = 0;
    let errorCount = 0;
    
    for (const currency of SUPPORTED_CURRENCIES) {
      try {
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
        console.log(`✅ ${currency.code} - ${currency.name}`);
        successCount++;
      } catch (error) {
        console.log(`❌ Failed to initialize ${currency.code}:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`🎉 Worldwide currencies initialization completed!`);
    console.log(`✅ Success: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📊 Total: ${SUPPORTED_CURRENCIES.length} currencies`);
    
  } catch (error) {
    console.error('❌ Error initializing worldwide currencies:', error);
  } finally {
    await prisma.$disconnect();
  }
}

initializeWorldwideCurrencies();