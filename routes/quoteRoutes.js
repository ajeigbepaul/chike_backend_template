import express from 'express';
import {
  createQuoteRequest,
  getAllQuotes,
  getQuote,
  updateQuoteStatus,
  getProductQuoteForCustomer,
  addQuoteMessage,
  getQuotesForUser
} from '../controllers/quoteController.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// Public routes
router.post('/', createQuoteRequest);
router.get('/', getAllQuotes);
router.get('/user', getQuotesForUser);
router.get('/:id', getQuote);
router.get('/product/:productId/customer', getProductQuoteForCustomer);
router.patch('/:id/messages', addQuoteMessage);
// Admin-only routes
router.patch('/:id', authenticate, authorize(['admin']), updateQuoteStatus);

export default router;