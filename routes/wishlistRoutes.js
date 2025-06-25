import express from 'express';
import { addToWishlist, removeFromWishlist, getWishlist } from '../controllers/wishlistController.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// Only authenticated users with role 'user' can access wishlist
router.post('/', authenticate, authorize(['user']), addToWishlist);
router.delete('/:productId', authenticate, authorize(['user']), removeFromWishlist);
router.get('/', authenticate, authorize(['user']), getWishlist);

export default router; 