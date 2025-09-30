// src/routes/searchRoutes.js
import express from "express";
import { 
  globalSearch, 
  getSearchSuggestions,
  getPopularSearches,
  getTrendingProducts
} from "../controllers/searchController.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { searchValidator } from "../validators/searchValidator.js";

const router = express.Router();

router.get("/global", searchValidator, validateRequest, globalSearch);
router.get("/suggestions", searchValidator, validateRequest, getSearchSuggestions);
router.get("/popular", getPopularSearches);
router.get("/trending", getTrendingProducts);

export default router;