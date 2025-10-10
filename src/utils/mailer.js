import nodemailer from "nodemailer";

export async function sendMail(to, subject, html) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false // ⚠️ Only for development!
    }
  });

  return transporter.sendMail({
    from: `"Tech Buddyzz" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  });
}