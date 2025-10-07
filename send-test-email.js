// send-test-email.js
import { Resend } from "resend";
import dotenv from "dotenv";

dotenv.config(); // loads your .env file

// Initialize resend client
const resend = new Resend(process.env.RESEND_API_KEY);

async function sendTestEmail() {
  try {
    console.log("📤 Sending test email...");

    const response = await resend.emails.send({
      from: "Agumiya Collections <alagar@thetechbuddyz.com>",
      to: "rohit17302@gmail.com", // change this if needed
      subject: "🚀 Test Email from Resend + thetechbuddyz.com",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5;">
          <h2 style="color: #2e86de;">Hello Buddy 👋</h2>
          <p>This is a test email sent via <b>Resend</b> using your verified domain:</p>
          <p style="color: #27ae60;"><b>thetechbuddyz.com</b></p>
          <p>If you're reading this in Gmail inbox — congrats 🎉 your domain DKIM is working!</p>
          <hr />
          <p style="font-size: 12px; color: #888;">© ${new Date().getFullYear()} Agumiya Collections</p>
        </div>
      `,
    });

    console.log("✅ Email sent successfully!");
    console.log("📧 Response:", response);
  } catch (error) {
    console.error("❌ Email send error:", error);
  }
}

sendTestEmail();
