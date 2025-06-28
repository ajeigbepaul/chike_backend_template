import express from 'express';
import {
  createOrder,
  getMyOrders,
  getOrder,
  generateInvoiceController as generateInvoice,
  getAllOrders,
  updateOrderToPaid,
  updateOrderToDelivered,
  updateOrderStatus,
  updateMyOrder,
  updateOrderPaymentReference,
  deleteOrder,
} from '../controllers/orderController.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';


const router = express.Router();

router.use(authenticate);

router.post('/', createOrder);
router.get('/my-orders', getMyOrders);
router.get('/:id', getOrder);
router.get('/:id/invoice', generateInvoice);
router.patch('/:id/update', updateMyOrder); // User can update their own orders
router.patch('/:id/payment-reference', updateOrderPaymentReference); // User can update payment reference
router.delete('/:id', deleteOrder); // User can delete their own orders

router.use(authorize(['admin']));

router.get('/', getAllOrders);
router.patch('/:id', updateOrderStatus);
router.patch('/:id/pay', updateOrderToPaid);
router.patch('/:id/deliver', updateOrderToDelivered);

export default router;