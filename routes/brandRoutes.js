import express from 'express';
import {
  getAllBrands,
  createBrand,
  updateBrand,
  deleteBrand
} from '../controllers/brandController.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// Public route to get all brands for forms
router.get('/', getAllBrands);

// Admin-only routes
router.post('/', authenticate, authorize(['admin']), createBrand);
router.patch('/:id', authenticate, authorize(['admin']), updateBrand);
router.delete('/:id', authenticate, authorize(['admin']), deleteBrand);

export default router; 