import sendEmail from "../config/email.js";
import { FRONTEND_URL } from "../config/env.js";

export const sendVendorInvitation = async (email, name, token) => {
  const subject = "Vendor Invitation";
  const message = `Hello ${name},\n\nYou have been invited to join our platform as a vendor. Please click the link below to complete your registration:\n\n${FRONTEND_URL}/auth/verify?token=${token}\n\nThis invitation will expire in 24 hours.\n\nIf you did not request this invitation, please ignore this email.`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Vendor Invitation</h2>
      <p>Hello ${name},</p>
      <p>You have been invited to join our platform as a vendor. Please click the button below to complete your registration:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${FRONTEND_URL}/auth/verify?token=${token}" 
           style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
          Complete Registration
        </a>
      </div>
      <p style="color: #666; font-size: 14px;">This invitation will expire in 24 hours.</p>
      <p style="color: #666; font-size: 14px;">If you did not request this invitation, please ignore this email.</p>
    </div>
  `;

  await sendEmail({
    email,
    subject,
    message,
    html,
  });
};

// Test email function to verify Gmail configuration
export const sendTestEmail = async (email) => {
  const subject = "Test Email - Gmail Configuration";
  const message = `Hello,\n\nThis is a test email to verify that your Gmail configuration is working correctly.\n\nIf you receive this email, your Gmail setup is successful!\n\nBest regards,\nYour Application`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
      <h2 style="color: #333; text-align: center;">✅ Gmail Configuration Test</h2>
      <p>Hello,</p>
      <p>This is a test email to verify that your Gmail configuration is working correctly.</p>
      <div style="background-color: #d4edda; border: 1px solid #c3e6cb; border-radius: 4px; padding: 15px; margin: 20px 0;">
        <p style="color: #155724; margin: 0; font-weight: bold;">🎉 Success! If you receive this email, your Gmail setup is working properly.</p>
      </div>
      <p>You can now use email functionality in your application.</p>
      <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
      <p style="color: #666; font-size: 14px; text-align: center;">Best regards,<br>Your Application</p>
    </div>
  `;

  await sendEmail({
    email,
    subject,
    message,
    html,
  });
};

export default {
  sendVendorInvitation,
  sendTestEmail,
};
