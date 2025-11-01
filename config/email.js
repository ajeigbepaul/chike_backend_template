// const nodemailer = require('nodemailer');
// const dotenv = require('dotenv');
import nodemailer from 'nodemailer';
import { EMAIL_HOST,EMAIL_PASS,EMAIL_PORT,EMAIL_SERVICE,EMAIL_USER,EMAIL_FROM,EMAIL_FROM_NAME } from './env.js';


const transporter = nodemailer.createTransport({
  service: EMAIL_SERVICE, // Use Gmail service
  host: EMAIL_HOST,
  port: EMAIL_PORT,
  secure: true, // Use SSL for Gmail
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});

const sendEmail = async (options) => {
  try {
    const mailOptions = {
      from: `"${EMAIL_FROM_NAME}" <${EMAIL_FROM}>`,
      to: options.email,
      subject: options.subject,
      text: options.message,
      html: options.html,
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Email sending error:', error);
    throw error;
  }
};

// module.exports = sendEmail;
export default sendEmail;