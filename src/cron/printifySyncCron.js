// src/cron/printifySyncCron.js
import cron from "node-cron";
import { syncProducts } from "../services/productService.js";
import logger from "../utils/logger.js";

const SHOP_ID = process.env.PRINTIFY_SHOP_ID;

export function startPrintifySyncCron() {
  if (!SHOP_ID) {
    logger.warn("⚠️ PRINTIFY_SHOP_ID not found in environment variables. Skipping CRON setup.");
    return;
  }

  logger.info("🕒 Initializing Printify auto-sync CRON job...");

  // Schedule: Run every day at 3:00 AM
  cron.schedule("0 3 * * *", async () => {
    logger.info("🔄 [CRON] Starting daily Printify sync...");

    try {
      const result = await syncProducts(SHOP_ID);
      logger.info(
        `✅ [CRON] Sync complete — ${result.published} published / ${result.unpublished} unpublished (total: ${result.totalProducts})`
      );
    } catch (error) {
      logger.error("❌ [CRON] Printify sync failed:", error.message);
    }
  });

  // Optional: run once at startup for immediate sync
  (async () => {
    logger.info("🚀 Running immediate Printify sync at startup...");
    try {
      const result = await syncProducts(SHOP_ID);
      logger.info(
        `✅ [Startup Sync] ${result.published} published / ${result.unpublished} unpublished (total: ${result.totalProducts})`
      );
    } catch (error) {
      logger.error("❌ [Startup Sync] Printify sync failed:", error.message);
    }
  })();

  logger.info("✅ Printify CRON job scheduled (runs daily at 3:00 AM)");
}
