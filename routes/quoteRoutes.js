import express from 'express';
import {
  createQuoteRequest,
  getAllQuotes,
  getQuote,
  updateQuoteStatus,
  getProductQuoteForCustomer
} from '../controllers/quoteController.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// Public routes
router.post('/', createQuoteRequest);
router.get('/', getAllQuotes);
router.get('/:id', getQuote);
router.get('/product/:productId/customer', getProductQuoteForCustomer);

// Admin-only routes
router.patch('/:id', authenticate, authorize(['admin']), updateQuoteStatus);

export default router;