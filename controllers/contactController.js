import sendEmail from "../config/email.js";
import AppError from "../utils/AppError.js";
import catchAsync from "../utils/catchAsync.js";
import { EMAIL_FROM, EMAIL_USER, EMAIL_FROM_NAME } from "../config/env.js";

// POST /api/v1/contact
// Public endpoint to receive contact-us messages and email the support inbox
export const sendContactMessage = catchAsync(async (req, res, next) => {
  const { firstName, lastName, email, phone, topic, subject, message } =
    req.body || {};

  // Basic runtime safety (express-validator handles main validation)
  if (!firstName || !lastName || !email || !message) {
    return next(new AppError("Missing required fields", 400));
  }

  const fullName = `${firstName} ${lastName}`.trim();

  // Choose recipient from env (support inbox)
  const supportInbox = EMAIL_FROM || EMAIL_USER;
  if (!supportInbox) {
    return next(
      new AppError("Support email is not configured on the server", 500)
    );
  }

  const safeSubject =
    subject?.trim() || `New contact request${topic ? `: ${topic}` : ""}`;

  const textMessage = `New contact message from ${fullName}

Email: ${email}
Phone: ${phone || "-"}
Topic: ${topic || "-"}

Message:\n${message}`;

  const htmlMessage = `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
      <h2 style="margin: 0 0 12px;">New Contact Message</h2>
      <p style="margin: 0 0 16px; color: #555;">You received a new message from the website contact form.</p>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
        <tbody>
          <tr>
            <td style="padding: 6px 0; color: #777; width: 140px;">From</td>
            <td style="padding: 6px 0; color: #222;"><strong>${fullName}</strong></td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #777;">Email</td>
            <td style="padding: 6px 0; color: #222;">${email}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #777;">Phone</td>
            <td style="padding: 6px 0; color: #222;">${phone || "-"}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #777;">Topic</td>
            <td style="padding: 6px 0; color: #222;">${topic || "-"}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #777;">Subject</td>
            <td style="padding: 6px 0; color: #222;">${safeSubject}</td>
          </tr>
        </tbody>
      </table>
      <div style="padding: 12px; background: #fafafa; border: 1px solid #eee; border-radius: 6px;">
        <div style="color: #111; font-weight: bold; margin-bottom: 8px;">Message</div>
        <div style="white-space: pre-wrap; color: #333;">${message}</div>
      </div>
    </div>
  `;

  await sendEmail({
    email: supportInbox, // recipient (support)
    subject: `[Contact] ${safeSubject}`,
    message: textMessage,
    html: htmlMessage,
  });

  res.status(200).json({
    success: true,
    message: "Your message has been sent. We will get back to you shortly.",
  });
});

export default { sendContactMessage };
