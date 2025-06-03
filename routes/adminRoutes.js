import express from 'express';
import {
  getDashboardStats,
  bulkImportProducts,
  bulkExportProducts,
  updateOrderStatus,
  bulkUpdateOrders,
  getAllUsers,
  updateUserRole,
  inviteVendor,
  getVendorStats,
  generateSalesReport,
  exportSalesReport
} from '../controllers/adminController.js';
import { protect, restrictTo } from '../controllers/authController.js';
import upload from '../utils/multerConfig.js';

const router = express.Router();

// Protect all routes for admin only
router.use(protect, restrictTo('admin'));

// Dashboard routes
router.get('/dashboard', getDashboardStats);

// Product management routes
router.post('/products/import', upload.single('file'), bulkImportProducts);
router.get('/products/export', bulkExportProducts);

// Order management routes
router.patch('/orders/:id/status', updateOrderStatus);
router.patch('/orders/bulk-status', bulkUpdateOrders);

// User management routes
router.get('/users', getAllUsers);
router.patch('/users/:id/role', updateUserRole);

// Vendor management routes
router.post('/vendors/invite', inviteVendor);
router.get('/vendors/:id/stats', getVendorStats);

// Analytics & reports routes
router.get('/reports/sales', generateSalesReport);
router.get('/reports/sales/export', exportSalesReport);

export default router;