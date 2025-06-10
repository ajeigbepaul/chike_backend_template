import express from 'express';
import {
  getAllCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
  exportCategories,
  importCategories
} from '../controllers/categoryController.js';
import { protect, restrictTo } from '../controllers/authController.js';
import multer from 'multer';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Public routes
router.get('/', getAllCategories);
router.get('/:id', getCategory);

// Protected routes (admin only)
router.use(protect, restrictTo('admin'));

router.post('/', createCategory);
router.patch('/:id', updateCategory);
router.delete('/:id', deleteCategory);
router.post('/reorder', reorderCategories);
router.get('/export', exportCategories);
router.post('/import', upload.single('file'), importCategories);

export default router; 