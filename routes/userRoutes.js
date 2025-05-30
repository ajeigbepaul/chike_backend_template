import express from 'express';
import {
  getAllUsers,
  getUser,
  updateUser,
  deleteUser,
  updateMe,
  deleteMe,
  getMe,
  uploadUserPhoto,
  resizeUserPhoto,
  addToWishlist,
  getWishlist,
  removeFromWishlist,
  addAddress,
  getAddresses,
  updateAddress,
  removeAddress,
  setDefaultAddress
} from '../controllers/userController.js';
import {
  protect,
  restrictTo
} from '../controllers/authController.js';

const router = express.Router();

// Protect all routes after this middleware
router.use(protect);

// User profile routes
router.get('/me', getMe, getUser);
router.patch('/update-me', uploadUserPhoto, resizeUserPhoto, updateMe);
router.delete('/delete-me', deleteMe);

// Wishlist routes
router.get('/wishlist', getWishlist);
router.post('/wishlist/:productId', addToWishlist);
router.delete('/wishlist/:productId', removeFromWishlist);

// Address routes
router.get('/addresses', getAddresses);
router.post('/addresses', addAddress);
router.patch('/addresses/:addressId', updateAddress);
router.delete('/addresses/:addressId', removeAddress);
router.patch('/addresses/:addressId/set-default', setDefaultAddress);

// Admin-only routes
router.use(restrictTo('admin'));

router.get('/', getAllUsers);
router
  .route('/:id')
  .get(getUser)
  .patch(updateUser)
  .delete(deleteUser);

export default router;