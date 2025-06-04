import express from "express";
import { body, query, param } from "express-validator";

// Import middleware
import { validateRequest } from "../middleware/validateRequest.js";
import * as vendorController from "../controllers/vendorController.js";
// Import vendor controller
// import * as vendorController from "../controllers/vendor.controller.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";

const router = express.Router();

// Public routes
/**
 * @route   GET /api/v1/vendors/verify-invitation
 * @desc    Verify vendor invitation token
 * @access  Public
 */
router.get(
  "/verify-invitation",
  [
    query("token").isString().notEmpty().withMessage("Valid token is required"),
    validateRequest,
  ],
  vendorController.verifyInvitation
);

/**
 * @route   POST /api/v1/vendors/onboarding
 * @desc    Complete vendor onboarding with invitation token
 * @access  Public
 */
router.post(
  "/onboarding",
  [
    body("token").isString().notEmpty().withMessage("Valid token is required"),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters"),
    body("phone").notEmpty().withMessage("Phone number is required"),
    body("address").notEmpty().withMessage("Address is required"),
    body("bio").notEmpty().withMessage("Bio is required"),
    validateRequest,
  ],
  vendorController.completeOnboarding
);



// Vendor-only routes
/**
 * @route   GET /api/v1/vendors/profile
 * @desc    Get vendor profile
 * @access  Vendor only
 */
router.get(
  "/profile",
  authenticate,
  authorize(["vendor"]),
  vendorController.getVendorProfile
);

/**
 * @route   PUT /api/v1/vendors/profile
 * @desc    Update vendor profile
 * @access  Vendor only
 */
router.put(
  "/profile",
  authenticate,
  authorize(["vendor"]),
  [
    body("businessName").optional(),
    body("phone").optional(),
    body("address").optional(),
    body("bio").optional(),
    validateRequest,
  ],
  vendorController.updateVendorProfile
);

/**
 * @route   GET /api/v1/vendors/stats
 * @desc    Get vendor dashboard stats
 * @access  Vendor only
 */
router.get(
  "/stats",
  authenticate,
  authorize(["vendor"]),
  vendorController.getVendorStats
);

export default router;
