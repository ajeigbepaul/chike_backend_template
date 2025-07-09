import { authenticate, authorize } from "../middleware/auth.middleware.js";
import express from "express";
import {
  getAdverts,
  getAdvertById,
  createAdvert,
  updateAdvert,
  deleteAdvert,
  uploadAdvertImage,
  processAdvertImage,
} from "../controllers/advertController.js";
const router = express.Router();

// Get all adverts
router.get("/", getAdverts);
// Get single advert
router.get("/:id", getAdvertById);

// Protected routes (admin only)
router.use(authenticate, authorize(["admin"]));
// Create advert
router.post("/", uploadAdvertImage, processAdvertImage, createAdvert);
// Update advert
router.put("/:id", uploadAdvertImage, processAdvertImage, updateAdvert);
// Delete advert
router.delete("/:id", deleteAdvert);

export default router;
