import express from 'express';
import { addToWishlist, removeFromWishlist, getWishlist } from '../controllers/wishlistController.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// Any signed-in account can keep a wishlist. Restricting to 'user'
// meant admin and vendor accounts got a 403 when favouriting.
router.post('/', authenticate, authorize(['user', 'vendor', 'admin']), addToWishlist);
router.delete('/:productId', authenticate, authorize(['user', 'vendor', 'admin']), removeFromWishlist);
router.get('/', authenticate, authorize(['user', 'vendor', 'admin']), getWishlist);

export default router; 