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
  getProductsByCategory,
  deleteProduct,
  deletePrintifyProduct,
  bulkDeleteProducts,
  getProductsWithReviewStats,
  getProductReviews,
  getProductReviewStats
} from "../controllers/productController.js";
import { 
  productSyncValidator, 
  productQueryValidator 
} from "../validators/productValidator.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { verifyAdminToken } from "../middlewares/authToken.js";

const router = express.Router();

// GET /products - Get all products (public)
router.get("/", productQueryValidator, validateRequest, getAllProducts);

// ✅ Static routes first
router.get("/admin", verifyAdminToken, productQueryValidator, validateRequest, getAllProductsAdmin);
router.get("/filters", getProductFilters);
router.get("/filter", filterProducts);
router.get("/category/:category", getProductsByCategory);
router.get("/sync/:shopId", productSyncValidator, validateRequest, syncProducts);
router.get("/debug/info", verifyAdminToken, debugProducts);

// Add these routes BEFORE your dynamic routes
router.get("/with-reviews", getProductsWithReviewStats); // For home page with review data
router.get("/:productId/reviews", getProductReviews); // For individual product reviews
router.get("/:productId/review-stats", getProductReviewStats); // Just stats for product cards
// ✅ DELETE routes (before dynamic routes) - Admin only
router.delete("/bulk-delete", verifyAdminToken, bulkDeleteProducts);
router.delete("/printify/:shopId/:printifyProductId", verifyAdminToken, deletePrintifyProduct);

// ✅ Dynamic routes after all static routes
router.get("/:productId/similar", getSimilarProducts);
router.get("/:productId/variants", getProductVariants);
router.delete("/:id", verifyAdminToken, deleteProduct);
router.get("/:id", getProductById);

export default router;