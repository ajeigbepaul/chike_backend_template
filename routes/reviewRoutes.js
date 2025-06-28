import express from 'express';
import {
  getAllReviews,
  getReview,
  createReview,
  updateReview,
  deleteReview,
  reportReview,
  getReviewsForProduct,
  getMyReviews
} from '../controllers/reviewController.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router({ mergeParams: true });

// Public routes
router.get('/', getAllReviews);
router.get('/product/:productId', getReviewsForProduct);
router.get('/:id', getReview);

// Protected routes (require authentication)
router.use(authenticate);

router.get('/my-reviews', getMyReviews);
router.post(
  '/',
  authorize(['user']),
  createReview
);
router.patch(
  '/:id',
  authorize(['user', 'admin']),
  updateReview
);
router.delete(
  '/:id',
  authorize(['user', 'admin']),
  deleteReview
);
router.post(
  '/:id/report',
  authorize(['user']),
  reportReview
);

export default router;