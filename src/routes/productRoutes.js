// routes/productRoutes.js
import express from "express";
import {
  createProduct,
  getProducts,
  getProduct,
  updateProduct,
  deleteProduct,
  toggleStock,
  getCategories,
  deleteImage
} from "../controllers/productController.js";
import {
  createProductValidator,
  updateProductValidator,
  productQueryValidator
} from "../validators/productValidator.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { verifyAdminToken } from "../middlewares/authToken.js";
import { upload } from "../utils/cloudinary.js";

const router = express.Router();

// Public routes
router.get("/", productQueryValidator, validateRequest, getProducts);
router.get("/categories", getCategories);
router.get("/:id", getProduct);

// Admin protected routes
router.post(
  "/",
  verifyAdminToken,
  upload.array('images', 10),
  createProductValidator,
  validateRequest,
  createProduct
);

router.put(
  "/:id",
  verifyAdminToken,
  upload.array('images', 10),
  updateProductValidator,
  validateRequest,
  updateProduct
);

router.delete("/:id", verifyAdminToken, deleteProduct);
router.patch("/:id/stock", verifyAdminToken, toggleStock);
router.delete("/:id/image", verifyAdminToken, deleteImage);

export default router;