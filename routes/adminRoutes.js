import express from 'express';
import { body, param } from 'express-validator';
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
  exportSalesReport,
  deleteVendor,
  getAllVendors,
  getVendorById,
  updateVendorStatus
} from '../controllers/adminController.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import upload from '../utils/multerConfig.js';
import { validateRequest } from "../middleware/validateRequest.js";

const router = express.Router();

// Protect all routes for admin only
router.use(authenticate, authorize(['admin']));

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
router.post('/vendors/invite', [
  body("email").isEmail().withMessage("Valid email is required"),
  body("name").notEmpty().withMessage("Name is required"),
  body("phone").optional(),
  validateRequest,
], inviteVendor);

router.get('/vendors', getAllVendors);
router.get('/vendors/:id', [
  param("id").isMongoId().withMessage("Valid vendor ID is required"),
  validateRequest,
], getVendorById);

router.patch('/vendors/:id/status', [
  param("id").isMongoId().withMessage("Valid vendor ID is required"),
  body("status")
    .isIn(["active", "inactive"])
    .withMessage("Status must be active or inactive"),
  validateRequest,
], updateVendorStatus);

router.delete('/vendors/:id', [
  param("id").isMongoId().withMessage("Valid vendor ID is required"),
  validateRequest,
], deleteVendor);

router.get('/vendors/:id/stats', getVendorStats);
// Analytics & reports routes
router.get('/reports/sales', generateSalesReport);
router.get('/reports/sales/export', exportSalesReport);

export default router;