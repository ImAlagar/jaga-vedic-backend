import nodemailer from "nodemailer";

export async function sendMail(to, subject, html) {
  console.log("📤 Sending email to:", to);

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: true, 
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    const info = await transporter.sendMail({
      from: `"Agumiya Collections" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });

    console.log("✅ Email sent:", info.messageId);
    console.log("🧾 Preview URL:", nodemailer.getTestMessageUrl(info));
    return info;
  } catch (err) {
    console.error("❌ Email send error:", err);
    throw err;
  }
}
