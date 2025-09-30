// src/services/currencyUpdateService.js
import { currencyService } from "./currencyService.js";
import { CURRENCY_CONFIG } from "../config/currencyConfig.js";

class CurrencyUpdateService {
  constructor() {
    this.updateInterval = null;
    this.isUpdating = false;
  }

  startAutoUpdates() {
    // Update immediately on startup
    this.updateRates();
    
    // Set up periodic updates (every 24 hours)
    this.updateInterval = setInterval(() => {
      this.updateRates();
    }, CURRENCY_CONFIG.updateInterval);

    console.log("✅ Currency auto-update service started");
  }

  stopAutoUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      console.log("🛑 Currency auto-update service stopped");
    }
  }

  async updateRates() {
    // Prevent concurrent updates
    if (this.isUpdating) {
      console.log("⏳ Update already in progress, skipping...");
      return;
    }

    this.isUpdating = true;
    
    try {
      await currencyService.updateExchangeRates();
    } catch (error) {
      console.error("Auto-update failed:", error.message);
    } finally {
      this.isUpdating = false;
    }
  }

  // Method to force immediate update
  async forceUpdate() {
    console.log("🔄 Forcing immediate currency update...");
    return await this.updateRates();
  }
}

export const currencyUpdateService = new CurrencyUpdateService();