// utils/emailTemplates.js
export function getPasswordResetEmail(resetUrl, adminName = 'Admin') {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #f8f9fa; padding: 20px; text-align: center; }
                .content { padding: 30px; background: #fff; border: 1px solid #e9ecef; }
                .button { display: inline-block; padding: 12px 24px; background: #007bff; 
                         color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
                .footer { margin-top: 20px; padding: 20px; background: #f8f9fa; 
                         text-align: center; font-size: 12px; color: #6c757d; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>Tech Buddyzz</h2>
                </div>
                <div class="content">
                    <h3>Password Reset Request</h3>
                    <p>Hello ${adminName},</p>
                    <p>We received a request to reset your password for your Tech Buddyzz admin account.</p>
                    <p>Click the button below to reset your password:</p>
                    <p style="text-align: center;">
                        <a href="${resetUrl}" class="button">Reset Password</a>
                    </p>
                    <p>This link will expire in 10 minutes for security reasons.</p>
                    <p>If you didn't request this password reset, please ignore this email or contact our support team immediately.</p>
                </div>
                <div class="footer">
                    <p>© ${new Date().getFullYear()} Tech Buddyzz. All rights reserved.</p>
                    <p>This is an automated message, please do not reply to this email.</p>
                </div>
            </div>
        </body>
        </html>
    `;
}

export function getPasswordResetSuccessEmail(adminName = 'Admin') {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #f8f9fa; padding: 20px; text-align: center; }
                .content { padding: 30px; background: #fff; border: 1px solid #e9ecef; }
                .footer { margin-top: 20px; padding: 20px; background: #f8f9fa; 
                         text-align: center; font-size: 12px; color: #6c757d; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>Tech Buddyzz</h2>
                </div>
                <div class="content">
                    <h3>Password Reset Successful</h3>
                    <p>Hello ${adminName},</p>
                    <p>Your password has been successfully reset for your Tech Buddyzz admin account.</p>
                    <p>If you did not initiate this change, please contact our support team immediately to secure your account.</p>
                </div>
                <div class="footer">
                    <p>© ${new Date().getFullYear()} Tech Buddyzz. All rights reserved.</p>
                    <p>This is an automated message, please do not reply to this email.</p>
                </div>
            </div>
        </body>
        </html>
    `;
}


// utils/emailTemplates.js (Add these templates)
export function getWelcomeEmail(name, verificationUrl) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .button { background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
        </style>
    </head>
    <body>
        <div class="container">
            <h2>Welcome to Our Platform, ${name}!</h2>
            <p>Thank you for registering. Please verify your email address to get started.</p>
            <a href="${verificationUrl}" class="button">Verify Email</a>
            <p>If the button doesn't work, copy and paste this link in your browser:</p>
            <p>${verificationUrl}</p>
        </div>
    </body>
    </html>
  `;
}