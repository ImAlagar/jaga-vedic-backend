// services/userService.js
import * as userModel from "../models/userModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { sendMail } from "../utils/mailer.js";
import { getWelcomeEmail, getPasswordResetEmail, getPasswordResetSuccessEmail } from "../utils/emailTemplates.js";
import logger from "../utils/logger.js";
import { addToBlacklist } from "../utils/tokenBlacklist.js";




export async function registerUser(name, email, password, phone) {
  try {

   

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error("Invalid email format");
    }

    // Check if user already exists
    const existingUser = await userModel.findUserByEmail(email);
    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Save new user
    const user = await userModel.createUser({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      phone,
      verificationToken
    });

    // ✅ CRITICAL FIX: Send email ASYNCHRONOUSLY without waiting
    sendMail(
      email,
      "Welcome to Our Platform - Verify Your Email",
      getWelcomeEmail(name)
    ).catch(error => {
      console.error('Email sending failed:', error);
      // Don't throw error - email failure shouldn't block registration
    });

    // ✅ Return response IMMEDIATELY without waiting for email
    return { 
      id: user.id, 
      name: user.name, 
      email: user.email, 
      phone: user.phone,
      message: "Registration successful. Please check your email for verification." 
    };
  } catch (error) {
    throw new Error(`Registration failed: ${error.message}`);
  }
}

export async function loginUser(email, password) {
  try {
    const user = await userModel.findUserByEmail(email.toLowerCase());
    
    if (!user) {
      throw new Error("No account found with this email address. Please check your email or sign up.");
    }

    if (!user.isActive) {
      throw new Error("Account temporarily unavailable. Please contact our support team to reactivate your account.");
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      throw new Error("The password you entered is incorrect. Please try again or reset your password.");
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        type: 'user'
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return { 
      token,
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        phone: user.phone,
        address: user.address,
        emailVerified: user.emailVerified
      }
    };
  } catch (error) {
    throw new Error(`${error.message}`);
  }
}

export async function getUserProfile(userId) {
  try {
    const user = await userModel.findUserById(userId);
    if (!user) {
      throw new Error("User not found");
    }
    return user;
  } catch (error) {
    throw new Error(`Failed to get user profile: ${error.message}`);
  }
}

export async function updateUserProfile(userId, updateData) {
  try {
    const user = await userModel.updateUser(
      { id: parseInt(userId) },
      updateData
    );

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      updatedAt: user.updatedAt
    };
  } catch (error) {
    throw new Error(`Failed to update profile: ${error.message}`);
  }
}
  


export async function forgotPassword(email) {
  try {
    
    const user = await userModel.findUserByEmail(email.toLowerCase());
    
    // Security: Always return same message
    const successResponse = { 
      message: "If the email exists, a password reset link has been sent" 
    };

    if (!user || !user.isActive) {
      return successResponse;
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 15 * 60 * 1000);

    // Update user with reset token
    await userModel.updateUser(
      { id: user.id },
      { 
        resetToken: token, 
        resetTokenExpiry: expiry,
        updatedAt: new Date()
      }
    );


    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${token}`;

    // Send email with better error handling
    const emailResult = await sendMail(
      user.email,
      "Password Reset Request",
      getPasswordResetEmail(resetUrl, user.name)
    );


    return successResponse;

  } catch (error) {
    console.error('❌ Forgot password error:', error);
    // Still return success for security
    return { 
      message: "If the email exists, a password reset link has been sent" 
    };
  }
}


export async function resetPassword(token, newPassword) {
  try {
    if (!token || token.length !== 64) {
      throw new Error("Invalid reset token");
    }

    const user = await userModel.findUserByResetToken(token);
    if (!user) {
      throw new Error("Invalid or expired reset token");
    }

    // Basic password validation
    if (!newPassword || newPassword.length < 6) {
      throw new Error("Password must be at least 6 characters long");
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    await userModel.updateUser(
      { id: user.id },
      { 
        password: hashedPassword, 
        resetToken: null, 
        resetTokenExpiry: null 
      }
    );


    // Send success email asynchronously
    sendMail(
      user.email,
      "Password Reset Successful",
      getPasswordResetSuccessEmail(user.name)
    )
    .then(() => {
      logger.log(`✅ Password reset success email sent to: ${user.email}`);
    })
    .catch(error => {
      console.error('❌ Success email failed:', error);
    });

    return { message: "Password has been reset successfully" };
  } catch (error) {
    throw new Error(`Password reset failed: ${error.message}`);
  }
}

// Admin services
export async function getAllUsers(page = 1, limit = 10, search = '') {
  try {
    return await userModel.findAllUsers(page, parseInt(limit), search);
  } catch (error) {
    throw new Error(`Failed to get users: ${error.message}`);
  }
}

export async function toggleUserActiveStatus(userId, isActive) {
  try {
    const user = await userModel.toggleUserStatus(userId, isActive);
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      isActive: user.isActive,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`
    };
  } catch (error) {
    throw new Error(`Failed to update user status: ${error.message}`);
  }
}



export async function getUserById(userId, includeOrders = false) {
  try {
    let user;
    
    if (includeOrders) {
      user = await userModel.findUserByIdWithOrders(userId);
    } else {
      user = await userModel.findUserById(userId);
    }
    
    if (!user) {
      throw new Error("User not found");
    }
    
    // If including orders, format the order data
    if (includeOrders && user.orders) {
      const formattedUser = {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        isActive: user.isActive,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        orders: user.orders.map(order => ({
          id: order.id,
          totalAmount: order.totalAmount,
          paymentStatus: order.paymentStatus,
          fulfillmentStatus: order.fulfillmentStatus,
          stripePaymentIntentId: order.stripePaymentIntentId,
          printifyOrderId: order.printifyOrderId,
          orderImage: order.orderImage,
          orderNotes: order.orderNotes,
          shippingAddress: order.shippingAddress,
          createdAt: order.createdAt,
          items: order.items.map(item => ({
            id: item.id,
            quantity: item.quantity,
            price: item.price,
            size: item.size,
            color: item.color,
            product: {
              id: item.product.id,
              name: item.product.name,
              price: item.product.price,
              images: item.product.images,
              printifyProductId: item.product.printifyProductId
            }
          }))
        }))
      };
      
      return formattedUser;
    }
    
    // Return basic user info without orders
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  } catch (error) {
    throw new Error(`Failed to get user: ${error.message}`);
  }
}


// Add this function to your userService.js
export async function getUserStats() {
  try {
    // Get total users count
    const totalUsers = await userModel.getTotalUsersCount();
    
    // Get active users count
    const activeUsers = await userModel.getActiveUsersCount();
    
    // Get inactive users count
    const inactiveUsers = await userModel.getInactiveUsersCount();
    
    // Get new users this month
    const newUsersThisMonth = await userModel.getNewUsersThisMonth();
    
    // Get total orders count (if you have orders)
    const totalOrders = await userModel.getTotalOrdersCount();
    
    // Get orders this month
    const ordersThisMonth = await userModel.getOrdersThisMonth();
    
    // Calculate percentages
    const activePercentage = totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0;
    const inactivePercentage = totalUsers > 0 ? Math.round((inactiveUsers / totalUsers) * 100) : 0;
    
    return {
      totalUsers,
      activeUsers,
      inactiveUsers,
      newUsersThisMonth,
      totalOrders,
      ordersThisMonth,
      activePercentage,
      inactivePercentage
    };
  } catch (error) {
    throw new Error(`Failed to get user stats: ${error.message}`);
  }
}


export async function logoutUser(token, userId) {
  try {
    // Add token to blacklist
    const blacklisted = await addToBlacklist(token);
    
    if (!blacklisted) {
      throw new Error("Failed to blacklist token");
    }

    // Clear refresh token from database (if you implement refresh tokens later)
    // await userModel.updateUser(
    //   { id: userId },
    //   { refreshToken: null }
    // );

    return { 
      success: true, 
      message: "Logout successful" 
    };
  } catch (error) {
    throw new Error(`Logout failed: ${error.message}`);
  }
}