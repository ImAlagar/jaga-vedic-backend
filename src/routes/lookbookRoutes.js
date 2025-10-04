// src/routes/lookbookRoutes.js
import express from "express";
import {
  getLookbookCollections,
  getLookbookLooks,
  getLookbookFilters,
  getAllLooks
} from "../controllers/lookbookController.js";

const router = express.Router();

// GET /lookbook/collections - Get collections (based on product categories)
router.get("/collections", getLookbookCollections);

// GET /lookbook/looks - Get filtered looks (based on products)
router.get("/looks", getLookbookLooks);

// GET /lookbook/looks/all - Get all looks
router.get("/looks/all", getAllLooks);

// GET /lookbook/filters - Get available filters
router.get("/filters", getLookbookFilters);

export default router;