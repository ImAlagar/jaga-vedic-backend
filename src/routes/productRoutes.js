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
  getSimilarProducts,
  getProductsByCategory
} from "../controllers/productController.js";
import { 
  productSyncValidator, 
  productQueryValidator 
} from "../validators/productValidator.js";
import { validateRequest } from "../middlewares/validateRequest.js";

const router = express.Router();

// GET /products - Get all products
router.get("/", productQueryValidator, validateRequest, getAllProducts);

// ✅ Static routes first
router.get("/admin", productQueryValidator, validateRequest, getAllProductsAdmin);
router.get("/filters", getProductFilters);
router.get("/filter", filterProducts);
router.get("/category/:category", getProductsByCategory); // Add category route
router.get("/sync/:shopId", productSyncValidator, validateRequest, syncProducts);
router.get("/debug/info", debugProducts);

// ✅ Dynamic routes after all static routes
router.get("/:productId/similar", getSimilarProducts);
router.get("/:productId/variants", getProductVariants);
router.get("/:id", getProductById);

export default router;