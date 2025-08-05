import express from "express";
import {
  getAllCategories,
  getCategory,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
  exportCategories,
  importCategories,
  uploadCategoryImage,
  resizeCategoryImage,
} from "../controllers/categoryController.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";
import multer from "multer";

const router = express.Router();

// Configure multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Public routes
router.get("/", getAllCategories);
router.get("/slug/:slug", getCategoryBySlug);
router.get("/:id", getCategory);

// Protected routes (admin only)
router.use(authenticate, authorize(["admin"]));

router.post("/", uploadCategoryImage, resizeCategoryImage, createCategory);
router.patch("/:id", uploadCategoryImage, resizeCategoryImage, updateCategory);
router.delete("/:id", deleteCategory);
router.post("/reorder", reorderCategories);
router.get("/export", exportCategories);
router.post("/import", upload.single("file"), importCategories);

export default router;
