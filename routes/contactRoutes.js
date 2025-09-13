import express from "express";
import { body } from "express-validator";
import { validateRequest } from "../middleware/validateRequest.js";
import { sendContactMessage } from "../controllers/contactController.js";

const router = express.Router();

// POST /api/v1/contact
router.post(
  "/",
  [
    body("firstName").trim().notEmpty().withMessage("First name is required"),
    body("lastName").trim().notEmpty().withMessage("Last name is required"),
    body("email")
      .isEmail()
      .withMessage("Valid email is required")
      .normalizeEmail(),
    body("phone")
      .optional()
      .isString()
      .isLength({ max: 40 })
      .withMessage("Phone is invalid"),
    body("topic")
      .optional()
      .isString()
      .isLength({ max: 80 })
      .withMessage("Topic is too long"),
    body("subject")
      .optional()
      .isString()
      .isLength({ max: 120 })
      .withMessage("Subject is too long"),
    body("message")
      .trim()
      .notEmpty()
      .isLength({ min: 10, max: 4000 })
      .withMessage("Message must be between 10 and 4000 characters"),
    validateRequest,
  ],
  sendContactMessage
);

export default router;
