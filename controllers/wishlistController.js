import Wishlist from '../models/wishlist.model.js';

// Add product to wishlist
export const addToWishlist = async (req, res) => {
  try {
    const { productId } = req.body;
    const userId = req.user._id;
    const exists = await Wishlist.findOne({ userId, productId });
    if (exists) return res.status(200).json({ success: true, message: 'Already in wishlist' });
    await Wishlist.create({ userId, productId });
    res.status(201).json({ success: true, message: 'Added to wishlist' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Remove product from wishlist
export const removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user._id;
    await Wishlist.findOneAndDelete({ userId, productId });
    res.json({ success: true, message: 'Removed from wishlist' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get all wishlist products for user
export const getWishlist = async (req, res) => {
  try {
    const userId = req.user._id;
    const wishlist = await Wishlist.find({ userId }).populate('productId');
    res.json({ success: true, data: wishlist });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}; 