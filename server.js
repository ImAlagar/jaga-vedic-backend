// server.js
import app from "./app.js";
import { connectDB, disconnectDB } from "./src/config/prisma.js";
import logger from "./src/utils/logger.js";
import { initSocket, getIO } from "./src/config/socket.js";
import { startPrintifySyncCron } from "./src/cron/printifySyncCron.js";

const PORT = process.env.PORT || 5000;

// Start server function
async function startServer() {
  try {
    // Connect to database
    await connectDB();
    logger.info("✅ Database connected successfully");
    startPrintifySyncCron();
    logger.info("✅ products synced successfully");
    // Start HTTP server
    const server = app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
      logger.info(`🌐 Allowed origins: ${process.env.ALLOWED_ORIGINS || 'All origins'}`);
    });

    // Initialize Socket.IO
    initSocket(server);
    logger.info("✅ Socket.IO initialized");

    // Make io available in routes
    app.use((req, res, next) => {
      req.io = getIO();
      next();
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


// Graceful shutdown function
async function gracefulShutdown(signal) {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  try {
    // Close server
    if (server) {
      server.close(() => {
        logger.info("HTTP server closed.");
      });
    }

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

// Start the application
let server;
startServer().then(s => {
  server = s;
});

// Export for testing purposes
export { app, startServer };