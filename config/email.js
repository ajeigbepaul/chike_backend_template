// const nodemailer = require('nodemailer');
// const dotenv = require('dotenv');
import nodemailer from 'nodemailer';
import { EMAIL_HOST,EMAIL_PASS,EMAIL_PORT,EMAIL_SERVICE,EMAIL_USER,EMAIL_FROM,EMAIL_FROM_NAME } from './env.js';


const smtpPort = Number(EMAIL_PORT) || 587;
const transporter = nodemailer.createTransport({
  ...(EMAIL_HOST
    ? {
        host: EMAIL_HOST,
        port: smtpPort,
        secure: smtpPort === 465,
        requireTLS: smtpPort === 587,
      }
    : { service: EMAIL_SERVICE || "gmail" }),
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});

const sendEmail = async (options) => {
  // Validate recipient email
    if (!options.email || options.email.trim() === '') {
      throw new Error('Recipient email is required');
    }
  try {
    const mailOptions = {
      from: `"${EMAIL_FROM_NAME}" <${EMAIL_FROM}>`,
      to: options.email,
      subject: options.subject,
      text: options.message,
      html: options.html,
    };

    const result = await transporter.sendMail(mailOptions);
    console.info(`Email sent to ${options.email}: ${result.messageId}`);
  } catch (error) {
    console.error('Email sending error:', error);
    throw error;
  }
};

// module.exports = sendEmail;
export default sendEmail;