import nodemailer from "nodemailer";

export async function sendMail(to, subject, html) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false, // true if using port 465
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return transporter.sendMail({
    from: `"Agumiya Collections" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  });
}   
