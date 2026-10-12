import express from 'express';
import { body } from 'express-validator';
import { validateRequest } from '../middleware/validateRequest.js';
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

// Mirrors the client rules in frontend/lib/quoteSchema.ts, so the API is safe
// regardless of the browser. Follows the contactRoutes.js pattern.
const quoteValidators = [
  body('productId').isMongoId().withMessage('A valid product is required'),
  body('productName').trim().notEmpty().withMessage('Product name is required'),
  body('quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be a whole number of at least 1'),
  body('customerName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('customerEmail')
    .trim()
    .isEmail()
    .withMessage('A valid email address is required')
    .isLength({ max: 254 })
    .withMessage('Email is too long')
    .normalizeEmail(),
  body('customerPhone')
    .optional({ values: 'falsy' })
    .trim()
    .matches(/^\+?[0-9\s\-()]{7,20}$/)
    .withMessage('Enter a valid phone number'),
  body('company')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 100 })
    .withMessage('Company name is too long'),
  body('message')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Message is too long'),
  body('expectedPrice')
    .optional({ values: 'falsy' })
    .isFloat({ gt: 0, max: 1000000000 })
    .withMessage('Expected price must be greater than 0'),
  body('urgency')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Invalid urgency'),
  validateRequest,
];

// Public routes
router.post('/', quoteValidators, createQuoteRequest);
router.get('/', getAllQuotes);
router.get('/user', getQuotesForUser);
router.get('/:id', getQuote);
router.get('/product/:productId/customer', getProductQuoteForCustomer);
router.patch('/:id/messages', addQuoteMessage);
// Admin-only routes
router.patch('/:id', authenticate, authorize(['admin']), updateQuoteStatus);

export default router;