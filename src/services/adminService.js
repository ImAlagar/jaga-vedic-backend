// services/adminService.js
import * as adminModel from "../models/adminModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { sendMail } from "../utils/mailer.js";
import { getPasswordResetEmail, getPasswordResetSuccessEmail } from "../utils/emailTemplates.js";

export async function registerAdmin(email, password) {
  try {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error("Invalid email format");
    }

    // Check if admin already exists
    const existingAdmin = await adminModel.findAdminByEmail(email);
    if (existingAdmin) {
      throw new Error("Admin with this email already exists");
    }

    // Validate password strength
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      throw new Error("Password must be at least 8 characters with uppercase, lowercase, number, and special character");
    }

    // Hash password
    const hashed = await bcrypt.hash(password, 12);

    // Save new admin
    const admin = await adminModel.createAdmin({
      email: email.toLowerCase(),
      password: hashed,
    });

    return { id: admin.id, email: admin.email, role: admin.role };
  } catch (error) {
    throw new Error(`Registration failed: ${error.message}`);
  }
}

export async function loginAdmin(email, password) {
  try {
    const admin = await adminModel.findAdminByEmail(email.toLowerCase());
    
    if (!admin) {
      throw new Error("Invalid credentials");
    }

    // Check if account is locked (optional: implement login attempts tracking)
    
    const valid = await bcrypt.compare(password, admin.password);
    if (!valid) {
      throw new Error("Invalid credentials");
    }

    const token = jwt.sign(
      {
        id: admin.id,
        email: admin.email,
        role: admin.role
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return { 
      token,
      admin: { id: admin.id, email: admin.email, role: admin.role }
    };
  } catch (error) {
    throw new Error(`Login failed: ${error.message}`);
  }
} 

export async function forgotPassword(email) {
    try {
        const admin = await adminModel.findAdminByEmail(email.toLowerCase());
        
        // Security: Don't reveal existence
        const successResponse = { 
            success: true,
            message: "If the email exists, a password reset link has been sent" 
        };

        if (!admin) {
            return successResponse;
        }

        const token = crypto.randomBytes(32).toString('hex');
        const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        await adminModel.updateAdmin(
            { id: admin.id },
            { resetToken: token, resetTokenExpiry: expiry }
        );

        const resetUrl = `${process.env.CLIENT_URL}/admin/reset-password?token=${token}`;

        // Send email SYNCHRONOUSLY
          try {
            sendMail(
              email,
              "Password Reset Request - Agumiya Collections",
              getPasswordResetEmail(resetUrl, user.name)
            ).catch(err => console.error('Email failed:', err.message));

            // 👇 Return immediately (frontend won’t timeout)
            return successResponse;
          } catch (error) {
            console.error('❌ Forgot password error:', error);
            return successResponse;
          }

        return successResponse;
    } catch (error) {
        console.error('Admin forgot password error:', error);
        return { 
            success: true,
            message: "If the email exists, a password reset link has been sent" 
        };
    }
}

export async function resetPassword(token, newPassword) {
  try {
    // Validate token format
    if (!token || token.length !== 64) {
      throw new Error("Invalid reset token");
    }

    const admin = await adminModel.findAdminByResetToken(token);
    
    if (!admin) {
      throw new Error("Invalid or expired reset token");
    }

    // Check if token is expired
    if (admin.resetTokenExpiry < new Date()) {
      throw new Error("Reset token has expired");
    }

    // Validate new password strength
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      throw new Error("Password must be at least 8 characters with uppercase, lowercase, number, and special character");
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    
    await adminModel.updateAdmin(
      { id: admin.id },
      { 
        password: hashed, 
        resetToken: null, 
        resetTokenExpiry: null 
      }
    );

    // Send confirmation email
    await sendMail(
      admin.email,
      "Password Reset Successful - Tech Buddyzz Admin",
      getPasswordResetSuccessEmail(admin.email.split('@')[0])
    );

    return { message: "Password has been reset successfully" };
  } catch (error) {
    throw new Error(`Password reset failed: ${error.message}`);
  }
}