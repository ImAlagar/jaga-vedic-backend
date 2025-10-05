// utils/mailer.js - Enhanced version
import nodemailer from 'nodemailer';

export async function sendMail(to, subject, html) {
  try {
    console.log(`📧 Preparing to send email to: ${to}`);
    console.log(`📋 Subject: ${subject}`);
    
    // Validate required environment variables
    const requiredEnvVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      const errorMsg = `Missing environment variables: ${missingVars.join(', ')}`;
      console.error('❌ Configuration error:', errorMsg);
      throw new Error(errorMsg);
    }

    console.log('✅ All required environment variables are set');

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      // Add timeout settings
      connectionTimeout: 10000, // 10 seconds
      greetingTimeout: 10000,
      socketTimeout: 15000,
      // Better error handling
      logger: true,
      debug: process.env.NODE_ENV === 'development'
    });

    console.log('🔧 Transporter created, verifying connection...');

    // Verify connection configuration
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully');

    const mailOptions = {
      from: `"Agumiya Collections" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
      // Add headers to improve deliverability
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'high'
      }
    };

    console.log('📤 Sending email...');
    const result = await transporter.sendMail(mailOptions);
    
    console.log(`✅ Email sent successfully to ${to}`);
    console.log(`📨 Message ID: ${result.messageId}`);
    console.log(`👤 Accepted: ${result.accepted}`);
    console.log(`❌ Rejected: ${result.rejected}`);
    
    return result;
  } catch (error) {
    console.error('❌ Email sending failed with details:', {
      to,
      subject,
      error: error.message,
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode,
      timestamp: new Date().toISOString()
    });
    
    // Enhanced error messages for common issues
    let userFriendlyError = error.message;
    
    if (error.code === 'EAUTH') {
      userFriendlyError = 'Authentication failed. Check your email credentials.';
    } else if (error.code === 'ECONNECTION') {
      userFriendlyError = 'Cannot connect to email server. Check SMTP settings.';
    } else if (error.code === 'ETIMEDOUT') {
      userFriendlyError = 'Email connection timed out.';
    }
    
    const enhancedError = new Error(userFriendlyError);
    enhancedError.originalError = error;
    enhancedError.code = error.code;
    
    throw enhancedError;
  }
}