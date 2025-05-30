// const crypto = require('crypto');
// const sendEmail = require('../config/email');
import crypto from 'crypto';
import sendEmail from '../config/email.js';

const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

const sendOTPEmail = async (email, otp) => {
  const subject = 'Your OTP for verification';
  const message = `Your OTP is ${otp}. It will expire in 10 minutes.`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Verification Code</h2>
      <p>Your OTP code is:</p>
      <div style="background: #f4f4f4; padding: 10px; margin: 10px 0; font-size: 24px; letter-spacing: 2px; text-align: center;">
        ${otp}
      </div>
      <p>This code will expire in 10 minutes.</p>
      <p>If you didn't request this, please ignore this email.</p>
    </div>
  `;

  await sendEmail({
    email,
    subject,
    message,
    html,
  });
};

// module.exports = {
//   generateOTP,
//   sendOTPEmail,
// };
export {
  generateOTP,
  sendOTPEmail,
};
