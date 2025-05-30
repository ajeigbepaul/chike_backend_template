import express from 'express';
import {
  createOrder,
  getMyOrders,
  getOrder,
  generateInvoiceController as generateInvoice,
  getAllOrders,
  updateOrderToPaid,
  updateOrderToDelivered,
} from '../controllers/orderController.js';
import { protect, restrictTo } from '../controllers/authController.js';

const router = express.Router();

router.use(protect);

router.post('/', createOrder);
router.get('/my-orders', getMyOrders);
router.get('/:id', getOrder);
router.get('/:id/invoice', generateInvoice);

router.use(restrictTo('admin'));

router.get('/', getAllOrders);
router.patch('/:id/pay', updateOrderToPaid);
router.patch('/:id/deliver', updateOrderToDelivered);

export default router;