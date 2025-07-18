import express from "express";
import {
  getAllPromotions,
  getPromotion,
  createPromotion,
  updatePromotion,
  deletePromotion,
  validateCoupon,
} from "../controllers/promotionController.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";

const router = express.Router();

// Public endpoint to validate/apply a coupon
router.post("/validate-coupon", validateCoupon);

// Protect all routes after this middleware
router.use(authenticate);

// Admin-only routes
router.use(authorize(["admin"]));

router.route("/").get(getAllPromotions).post(createPromotion);
router
  .route("/:id")
  .get(getPromotion)
  .patch(updatePromotion)
  .delete(deletePromotion);

export default router;
