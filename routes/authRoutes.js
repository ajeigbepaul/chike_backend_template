import express from 'express';
import {
  register,
  login,
  verifyEmail,
  forgotPassword,
  resetPassword,
  sendOTP,
  verifyOTP,
} from '../controllers/authController.js';
import {getSession} from '../controllers/authController.js'

const router = express.Router(); 

router.post('/register', register);
router.post('/login', login);
router.get('/verify-email/:token', verifyEmail);
router.post('/forgot-password', forgotPassword);
router.patch('/reset-password/:token', resetPassword);
router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);
router.get('/session', getSession);

export default router;