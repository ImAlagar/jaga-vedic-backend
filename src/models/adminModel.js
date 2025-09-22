// src/models/adminModel.js
import prisma from "../config/prisma.js";

export async function findAdminByEmail(email) {
  try {
    return await prisma.admin.findUnique({
      where: { email: email.toLowerCase() },
    });
  } catch (error) {
    console.error("Error finding admin by email:", error);
    throw new Error("Database error occurred");
  }
}

export async function findAdminByResetToken(token) {
  try {
    return await prisma.admin.findFirst({
      where: { 
        resetToken: token,
        resetTokenExpiry: {
          gt: new Date()
        }
      },
    });
  } catch (error) {
    console.error("Error finding admin by reset token:", error);
    throw new Error("Database error occurred");
  }
}

export async function createAdmin(data) {
  try {
    return await prisma.admin.create({
      data: {
        ...data,
        email: data.email.toLowerCase()
      },
    });
  } catch (error) {
    console.error("Error creating admin:", error);
    throw new Error("Failed to create admin account");
  }
}

export async function updateAdmin(where, data) {
  try {
    return await prisma.admin.update({
      where,
      data,
    });
  } catch (error) {
    console.error("Error updating admin:", error);
    throw new Error("Failed to update admin account");
  }
}

// Optional: Add more admin-related database operations as needed
export async function findAdminById(id) {
  try {
    return await prisma.admin.findUnique({
      where: { id: parseInt(id) },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true
      }
    });
  } catch (error) {
    console.error("Error finding admin by ID:", error);
    throw new Error("Database error occurred");
  }
}