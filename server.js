// server.js
import app from "./app.js";
import { connectDB, disconnectDB } from "./src/config/prisma.js";
import logger from "./src/utils/logger.js";

const PORT = process.env.PORT || 5000;

// Graceful shutdown function
async function gracefulShutdown(signal) {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  try {
    // Close server
    server.close(() => {
      logger.info("HTTP server closed.");
    });

    // Close database connection
    await disconnectDB();
    logger.info("Database connection closed.");

    // Exit process
    process.exit(0);
  } catch (error) {
    logger.error("Error during graceful shutdown:", error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", error);
  process.exit(1);
});

// Handle unhandled rejections
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

// Signal handlers for graceful shutdown
const signals = ["SIGINT", "SIGTERM", "SIGQUIT"];
signals.forEach(signal => {
  process.on(signal, () => gracefulShutdown(signal));
});

// Start server
async function startServer() {
  try {
    // Connect to database
    await connectDB();
    logger.info("✅ Database connected successfully");

    // Start HTTP server
    const server = app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
      logger.info(`🌐 Allowed origins: ${process.env.ALLOWED_ORIGINS || 'All origins'}`);
    });

    // Handle server errors
    server.on("error", (error) => {
      if (error.code === "EADDRINUSE") {
        logger.error(`Port ${PORT} is already in use`);
      } else {
        logger.error("Server error:", error);
      }
      process.exit(1);
    });

    return server;
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Start the application
const server = startServer();

// Export for testing purposes
export { app, startServer };