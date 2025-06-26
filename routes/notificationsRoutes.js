import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import * as notificationController from '../controllers/notificationController.js';

const router = express.Router();

router.use(authenticate);
router.get('/', notificationController.getNotifications);
router.get('/unread-count', notificationController.getUnreadCount);
router.patch('/:id/read', notificationController.markAsRead);

export default router; 