// src/middlewares/logging/requestLogger.js
import logger from "../../utils/logger.js";

const requestLogger = (req, res, next) => {
  const start = Date.now();

  // Log request details
  logger.info(`Incoming request: ${req.method} ${req.originalUrl}`, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    query: req.query,
    body: req.body
  });

  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.info(`Request completed: ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`, {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip
    });
  });

  next();
};

export default requestLogger;