import express from "express";
import {
  getAllProducts,
  createProduct,
  getProduct,
  updateProduct,
  deleteProduct,
  getProductStats,
  searchProducts,
  getAutocompleteSuggestions,
  uploadProductImages,
  resizeProductImages,
  getRelatedProducts,
  getMostOrderedProducts,
  getProductsByTag,
} from "../controllers/productController.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";
import reviewRouter from "./reviewRoutes.js";

const router = express.Router();

// Nested review routes
router.use("/:productId/reviews", reviewRouter);

// Public routes
router.get("/", getAllProducts);
router.get("/search", searchProducts);
router.get("/autocomplete", getAutocompleteSuggestions);
router.get("/stats", getProductStats);
router.get("/tag/:tag", getProductsByTag);
router.get("/:id/related", getRelatedProducts);
router.get("/most-ordered", getMostOrderedProducts);
router.get("/:id", getProduct);

// Protected routes (admin only)
router.use(authenticate, authorize(["admin", "vendor"]));

router.post("/", uploadProductImages, resizeProductImages, createProduct);

router.patch("/:id", uploadProductImages, resizeProductImages, updateProduct);

router.delete("/:id", deleteProduct);

export default router;
