import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * sendMail - send an email using Resend with a simple sender (no custom domain).
 * @param {string} to - recipient email
 * @param {string} subject - email subject
 * @param {string} html - email HTML body
 */
export async function sendMail(to, subject, html) {
  console.log("📤 Sending email to:", to);

  try {
    const response = await resend.emails.send({
      from: process.env.EMAIL_FROM,   // e.g. "Agumiya Collections <onboarding@resend.dev>"
      to,
      subject,
      html,
    });

    // Log raw response for debugging
    console.log("Raw resend response:", JSON.stringify(response, null, 2));

    // Get message id (if present)
    const messageId = response?.id ?? response?.data?.id ?? response?.messageId ?? null;
    console.log("✅ Email sent result id:", messageId ?? "No ID returned");

    return response;
  } catch (err) {
    // Better error logging
    console.error("❌ Email send error:", err?.response?.data ?? err.message ?? err);
    throw new Error(err.message ?? "Email send failed");
  }
}
