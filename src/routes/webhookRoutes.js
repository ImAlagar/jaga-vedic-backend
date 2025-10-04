import express from "express";
import { handleWebhook } from "../controllers/webhookController.js";

const router = express.Router();

// Webhook endpoint (no authentication needed - uses signature verification)
router.post("/webhook", express.raw({ type: 'application/json' }), handleWebhook);

export default router;