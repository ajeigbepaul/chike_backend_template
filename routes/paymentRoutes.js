import express from 'express';
import {
  initializePayment,
  verifyPayment,
  webhook,
} from '../controllers/paymentController.js';
import { protect } from '../controllers/authController.js';

const router = express.Router();

router.use(protect);

router.post('/initialize', initializePayment);
router.post('/verify', verifyPayment);

// Webhook endpoints (no auth needed)
router.post('/webhook/paystack', webhook);
router.post('/webhook/flutterwave', webhook);

export default router;