// src/jobs/orderSyncJob.js
import { OrderService } from "../services/orderService.js";
import logger from "../utils/logger.js";

const orderService = new OrderService();

export async function syncOrdersJob() {
  try {
    logger.info('🔄 Starting scheduled order sync...');
    const result = await orderService.syncAllOrdersStatus();
    logger.info(`✅ Order sync completed: ${result.successful}/${result.total} orders updated`);
    return result;
  } catch (error) {
    logger.error('❌ Scheduled order sync failed:', error);
    throw error;
  }
}

// Add to your main server file or job scheduler:
// Run every 30 minutes: '*/30 * * * *'