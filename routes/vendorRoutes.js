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

/**
 * @route   POST /api/v1/vendors/direct-onboarding
 * @desc    Complete vendor onboarding directly by user ID
 * @access  Public
 */
router.post(
  "/direct-onboarding",
  [
    body("userId").isString().notEmpty().withMessage("User ID is required"),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters"),
    body("phone").notEmpty().withMessage("Phone number is required"),
    body("address").notEmpty().withMessage("Address is required"),
    body("bio").notEmpty().withMessage("Bio is required"),
    validateRequest,
  ],
  vendorController.directOnboarding
);

/**
 * @route   POST /api/v1/vendors/request-invite
 * @desc    Request a vendor invitation (public)
 * @access  Public
 */
router.post(
  "/request-invite",
  [
    body("email").isEmail().withMessage("Valid email is required"),
    body("name").isString().notEmpty().withMessage("Name is required"),
    validateRequest,
  ],
  vendorController.requestInvite
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
 * @route   POST /api/v1/vendors/invite
 * @desc    Invite a vendor
 * @access  Admin only
 */
router.post(
  "/invite",
  authenticate,
  authorize(["admin"]),
  vendorController.inviteVendor
);

// router
//   .route("/vendors/invite")
//   .post(protect, restrictTo("admin"), inviteVendor);

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

// Admin-only: Get all vendors
router.get(
  "/all",
  authenticate,
  authorize(["admin"]),
  vendorController.getAllVendors
);

// Admin-only: Get all pending vendor invitations
router.get(
  "/admin/vendor-invitations",
  authenticate,
  authorize(["admin"]),
  vendorController.getAllInvitations
);

// Admin-only: Resend a pending vendor invitation
router.post(
  "/admin/vendor-invitations/:id/send",
  authenticate,
  authorize(["admin"]),
  vendorController.resendInvitation
);

// Admin-only: Delete a pending vendor invitation
router.delete(
  "/admin/vendor-invitations/:id",
  authenticate,
  authorize(["admin"]),
  vendorController.deleteInvitation
);

// Admin-only: Approve a vendor request
router.patch(
  "/admin/vendor-requests/:id/approve",
  authenticate,
  authorize(["admin"]),
  [
    param("id").isMongoId().withMessage("Valid invitation ID is required"),
    validateRequest,
  ],
  vendorController.approveVendorRequest
);

// Admin-only: Get vendor by ID
router.get(
  "/admin/:id",
  authenticate,
  authorize(["admin"]),
  [
    param("id").isMongoId().withMessage("Valid vendor ID is required"),
    validateRequest,
  ],
  vendorController.getVendorById
);

// Admin-only: Delete vendor
router.delete(
  "/admin/:id",
  authenticate,
  authorize(["admin"]),
  [
    param("id").isMongoId().withMessage("Valid vendor ID is required"),
    validateRequest,
  ],
  vendorController.deleteVendor
);

export default router;
