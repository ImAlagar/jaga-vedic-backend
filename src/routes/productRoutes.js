// src/routes/productRoutes.js
import express from "express";
import { 
  syncProducts, 
  getAllProducts, 
  getProductById,
    filterProducts,           // 👈 ADD THIS
  getProductFilters,
  getProductVariants  // Add this import
} from "../controllers/productController.js";
import { 
  productSyncValidator, 
  productQueryValidator 
} from "../validators/productValidator.js";
import { validateRequest } from "../middlewares/validateRequest.js";

const router = express.Router();

// GET /products - Get all products with pagination and filters
router.get("/", productQueryValidator, validateRequest, getAllProducts);

// GET /products/:id - Get single product
router.get("/:id", getProductById);

// GET /products/:productId/variants - Get product variants
router.get("/:productId/variants", getProductVariants); 

// GET /products/sync/:shopId - Sync products from Printify
router.get("/sync/:shopId", productSyncValidator, validateRequest, syncProducts);

router.get("/filters", getProductFilters);        // 👈 ADD THIS
router.get("/filter", filterProducts);   


export default router;
