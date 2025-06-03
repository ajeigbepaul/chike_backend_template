import express from "express";
import {
  verifyInvitation,
  completeOnboarding,
} from "../controllers/vendorController.js";

const router = express.Router();

// Public routes for vendor onboarding
router.get("/verify-invitation", verifyInvitation);
router.post("/onboarding", completeOnboarding);

export default router;
