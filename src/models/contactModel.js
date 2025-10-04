// src/models/contactModel.js
import prisma from "../config/prisma.js";

export async function createContactInquiry(data) {
  try {
    return await prisma.contactInquiry.create({
      data: {
        name: data.name,
        email: data.email,
        subject: data.subject,
        message: data.message,
        inquiryType: data.inquiryType,
        phone: data.phone,
        country: data.country, // 🔥 NEW FIELD - Added country
        callbackTime: data.callbackTime,
        status: 'PENDING'
      },
    });
  } catch (error) {
    console.error("Error creating contact inquiry:", error);
    throw new Error("Failed to create contact inquiry");
  }
}

export async function getAllContactInquiries(page = 1, limit = 10, status = null) {
  try {
    const skip = (page - 1) * limit;
    
    const where = status ? { status } : {};
    
    const [inquiries, total] = await Promise.all([
      prisma.contactInquiry.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.contactInquiry.count({ where })
    ]);
    
    return {
      inquiries,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    };
  } catch (error) {
    console.error("Error fetching contact inquiries:", error);
    throw new Error("Database error occurred");
  }
}

export async function getContactInquiryById(id) {
  try {
    return await prisma.contactInquiry.findUnique({
      where: { id: parseInt(id) },
    });
  } catch (error) {
    console.error("Error finding contact inquiry by ID:", error);
    throw new Error("Database error occurred");
  }
}

export async function updateContactInquiryStatus(id, status, adminNotes = null) {
  try {
    return await prisma.contactInquiry.update({
      where: { id: parseInt(id) },
      data: {
        status,
        adminNotes,
        updatedAt: new Date()
      },
    });
  } catch (error) {
    console.error("Error updating contact inquiry:", error);
    throw new Error("Failed to update contact inquiry");
  }
}

export async function getInquiryStats() {
  try {
    const stats = await prisma.contactInquiry.groupBy({
      by: ['status'],
      _count: {
        id: true
      }
    });
    
    const total = await prisma.contactInquiry.count();
    
    return {
      total,
      byStatus: stats.reduce((acc, stat) => {
        acc[stat.status] = stat._count.id;
        return acc;
      }, {})
    };
  } catch (error) {
    console.error("Error fetching inquiry stats:", error);
    throw new Error("Database error occurred");
  }
}