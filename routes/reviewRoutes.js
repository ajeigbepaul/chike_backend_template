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
import { protect, restrictTo } from '../controllers/authController.js';

const router = express.Router({ mergeParams: true });

// Public routes
router.get('/', getAllReviews);
router.get('/product/:productId', getReviewsForProduct);
router.get('/:id', getReview);

// Protected routes (require authentication)
router.use(protect);

router.get('/my-reviews', getMyReviews);
router.post(
  '/',
  restrictTo('user'),
  createReview
);
router.patch(
  '/:id',
  restrictTo('user', 'admin'),
  updateReview
);
router.delete(
  '/:id',
  restrictTo('user', 'admin'),
  deleteReview
);
router.post(
  '/:id/report',
  restrictTo('user'),
  reportReview
);

export default router;