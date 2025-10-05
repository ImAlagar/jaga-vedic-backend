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

export async function findUserById(userId) {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: parseInt(userId) // Make sure to parse the ID
      },
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
      }
    });
    return user;
  } catch (error) {
    throw new Error(`Failed to find user by ID: ${error.message}`);
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


// models/userModel.js - Add this function
export async function findUserByIdWithOrders(id) {
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
        orders: {
          include: {
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    price: true,
                    images: true,
                    printifyProductId: true
                  }
                }
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });
  } catch (error) {
    console.error("Error finding user by ID with orders:", error);
    throw new Error("Database error occurred");
  }
}

// Add these functions to your userModel.js

export async function getTotalUsersCount() {
  try {
    const count = await prisma.user.count();
    return count;
  } catch (error) {
    throw new Error(`Failed to get total users count: ${error.message}`);
  }
}

export async function getActiveUsersCount() {
  try {
    const count = await prisma.user.count({
      where: { isActive: true }
    });
    return count;
  } catch (error) {
    throw new Error(`Failed to get active users count: ${error.message}`);
  }
}

export async function getInactiveUsersCount() {
  try {
    const count = await prisma.user.count({
      where: { isActive: false }
    });
    return count;
  } catch ( error) {
    throw new Error(`Failed to get inactive users count: ${error.message}`);
  }
}

export async function getNewUsersThisMonth() {
  try {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const count = await prisma.user.count({
      where: {
        createdAt: {
          gte: startOfMonth
        }
      }
    });
    return count;
  } catch (error) {
    throw new Error(`Failed to get new users this month: ${error.message}`);
  }
}

export async function getTotalOrdersCount() {
  try {
    const count = await prisma.order.count();
    return count;
  } catch (error) {
    // If orders table doesn't exist yet, return 0
    return 0;
  }
}

export async function getOrdersThisMonth() {
  try {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const count = await prisma.order.count({
      where: {
        createdAt: {
          gte: startOfMonth
        }
      }
    });
    return count;
  } catch (error) {
    // If orders table doesn't exist yet, return 0
    return 0;
  }
}

// Add this function to your existing userModel.js
export async function findRecentResetToken(userId) {
  try {
    const user = await prisma.user.findFirst({
      where: {
        id: parseInt(userId),
        resetToken: { not: null },
        resetTokenExpiry: { gt: new Date() },
        updatedAt: { 
          gte: new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
        }
      },
      select: {
        resetToken: true,
        updatedAt: true
      }
    });
    
    return user;
  } catch (error) {
    console.error('Error finding recent reset token:', error);
    return null;
  }
}