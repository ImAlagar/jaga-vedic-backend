import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import routes from "./src/routes/index.js"
import requestLogger from "./src/middlewares/logging/requestLogger.js";
import logger from "./src/utils/logger.js";

dotenv.config();

const app = express();

app.set("trust proxy", 1);

app.use(helmet());


// Read origins from .env
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
    } else {
        callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  credentials: true
}));


app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/v1", routes);

// Health check endpoint
app.get("/health", (req, res) => {
    res.json({ 
        success: true,
        message: "Service is healthy"
    });
});



// Request logging
app.use(requestLogger);

// Error handler (use logger instead of console)
app.use((err, req, res, next) => {
  logger.error(err.message, { stack: err.stack });
  res.status(500).json({ error: err.message || "Server Error" });
});

export default app;