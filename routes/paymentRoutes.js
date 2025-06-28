import express from 'express';
import {
  initializePayment,
  verifyPayment,
  webhook,
} from '../controllers/paymentController.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// Public webhook endpoints (no auth needed)
router.post('/webhook/paystack', webhook);
router.post('/webhook/flutterwave', webhook);

// Debug endpoint to test if routes are working
router.get('/test', (req, res) => {
  res.json({ message: 'Payment routes are working!', timestamp: new Date().toISOString() });
});

// Only authenticated users with role 'user' can access payment endpoints
router.post('/initialize', authenticate, authorize(['user']), initializePayment);
router.post('/verify', authenticate, authorize(['user']), verifyPayment);

// (If you want admin/vendor-only payment endpoints, add below)
// router.use(restrictTo('admin', 'vendor'));
// ...

export default router;