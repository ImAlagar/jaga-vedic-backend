import express from "express";
import { 
  syncProducts, 
  getAllProducts, 
  getProductById,
  filterProducts,
  getProductFilters,
  getProductVariants,
  getAllProductsAdmin,
  debugProducts,
  getSimilarProducts
} from "../controllers/productController.js";
import { 
  productSyncValidator, 
  productQueryValidator 
} from "../validators/productValidator.js";
import { validateRequest } from "../middlewares/validateRequest.js";

const router = express.Router();

// GET /products - Get all products with pagination and filters
router.get("/", productQueryValidator, validateRequest, getAllProducts);

// GET /products/admin - Get all products including unpublished (for admin)
router.get("/admin", productQueryValidator, validateRequest, getAllProductsAdmin);

// GET /products/:id - Get single product
router.get("/:id", getProductById);

// GET /products/:productId/variants - Get product variants
router.get("/:productId/variants", getProductVariants);

// GET /products/sync/:shopId - Sync products from Printify
router.get("/sync/:shopId", productSyncValidator, validateRequest, syncProducts);

// GET /products/filters - Get available filters
router.get("/filters", getProductFilters);

// GET /products/filter - Filter products
router.get("/filter", filterProducts);

router.get("/debug/info", debugProducts);

router.get("/:productId/similar", getSimilarProducts);

export default router;