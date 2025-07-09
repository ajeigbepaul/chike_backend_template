import express from 'express';
import {
  getAllPromotions,
  getPromotion,
  createPromotion,
  updatePromotion,
  deletePromotion,
} from '../controllers/promotionController.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// Protect all routes after this middleware
router.use(authenticate);

// Admin-only routes
router.use(authorize(['admin']));

router.route('/').get(getAllPromotions).post(createPromotion);
router
  .route('/:id')
  .get(getPromotion)
  .patch(updatePromotion)
  .delete(deletePromotion);

export default router;
