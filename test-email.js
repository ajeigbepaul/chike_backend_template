import { sendTestEmail } from "./services/emailService.js";

const testEmail = async () => {
  try {
    console.log("Testing Gmail configuration...");
    await sendTestEmail("pdave4krist@yahoo.com");
    console.log("✅ Test email sent successfully!");
  } catch (error) {
    console.error("❌ Email test failed:", error.message);
  }
};

testEmail();
