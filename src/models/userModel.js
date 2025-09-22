// models/userModel.js
import prisma from "../config/prisma.js";

export async function findUserByEmail(email) {
  try {
    return await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  } catch (error) {
    console.error("Error finding user by email:", error);
    throw new Error("Database error occurred");
  }
}

export async function findUserById(id) {
  try {
    return await prisma.user.findUnique({
      where: { id: parseInt(id) },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        isActive: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        stripeCustomerId: true
      }
    });
  } catch (error) {
    console.error("Error finding user by ID:", error);
    throw new Error("Database error occurred");
  }
}

export async function findUserByResetToken(token) {
  try {
    return await prisma.user.findFirst({
      where: { 
        resetToken: token,
        resetTokenExpiry: {
          gt: new Date()
        }
      },
    });
  } catch (error) {
    console.error("Error finding user by reset token:", error);
    throw new Error("Database error occurred");
  }
}

export async function createUser(data) {
  try {
    return await prisma.user.create({
      data: {
        ...data,
        email: data.email.toLowerCase()
      },
    });
  } catch (error) {
    console.error("Error creating user:", error);
    throw new Error("Failed to create user account");
  }
}

export async function updateUser(where, data) {
  try {
    return await prisma.user.update({
      where,
      data,
    });
  } catch (error) {
    console.error("Error updating user:", error);
    throw new Error("Failed to update user account");
  }
}

export async function findAllUsers(page = 1, limit = 10, search = '') {
  try {
    const skip = (page - 1) * limit;
    
    const whereClause = {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ]
    };

    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          address: true,
          isActive: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true,
          orders: {
            select: {
              id: true,
              totalAmount: true,
              paymentStatus: true,
              createdAt: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.user.count({ where: whereClause })
    ]);

    return {
      users,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page
    };
  } catch (error) {
    console.error("Error finding all users:", error);
    throw new Error("Database error occurred");
  }
}

export async function toggleUserStatus(userId, isActive) {
  try {
    return await prisma.user.update({
      where: { id: parseInt(userId) },
      data: { isActive }
    });
  } catch (error) {
    console.error("Error toggling user status:", error);
    throw new Error("Failed to update user status");
  }
}