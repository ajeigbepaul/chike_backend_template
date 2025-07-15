import express from "express";
import { sendTestEmail } from "../services/emailService.js";

const router = express.Router();

// Test email endpoint
router.post("/test-email", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email address is required",
      });
    }

    await sendTestEmail(email);

    res.json({
      success: true,
      message: "Test email sent successfully! Check your inbox.",
    });
  } catch (error) {
    console.error("Test email error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send test email",
      error: error.message,
    });
  }
});

export default router;
