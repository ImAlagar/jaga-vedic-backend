// src/services/contactService.js
import * as contactModel from "../models/contactModel.js";
import { sendMail } from "../utils/mailer.js";
import { getContactConfirmationEmail, getNewInquiryAdminEmail } from "../utils/contactEmailTemplates.js";

export async function submitContactInquiry(inquiryData) {
  try {
    // Create the inquiry in database
    const inquiry = await contactModel.createContactInquiry(inquiryData);
    
    // Send confirmation email to user
    await sendMail(
      inquiry.email,
      "We've Received Your Inquiry - Tech Buddyzz",
      getContactConfirmationEmail(inquiry)
    );
    
    // Send notification email to admin
    await sendMail(
      process.env.ADMIN_EMAIL,
      `New Contact Inquiry: ${inquiry.subject}`,
      getNewInquiryAdminEmail(inquiry)
    );
    
    return inquiry;
  } catch (error) {
    console.error("Error in submitContactInquiry:", error);
    throw new Error(`Failed to submit contact inquiry: ${error.message}`);
  }
}

export async function getAllInquiriesService(page = 1, limit = 10, status = null) {
  try {
    return await contactModel.getAllContactInquiries(page, limit, status);
  } catch (error) {
    throw new Error(`Failed to fetch inquiries: ${error.message}`);
  }
}

export async function getInquiryByIdService(id) {
  try {
    const inquiry = await contactModel.getContactInquiryById(id);
    
    if (!inquiry) {
      throw new Error("Inquiry not found");
    }
    
    return inquiry;
  } catch (error) {
    throw new Error(`Failed to fetch inquiry: ${error.message}`);
  }
}

export async function updateInquiryStatusService(id, status, adminNotes = null) {
  try {
    // Check if inquiry exists
    const existingInquiry = await contactModel.getContactInquiryById(id);
    if (!existingInquiry) {
      throw new Error("Inquiry not found");
    }
    
    // Update the status
    const updatedInquiry = await contactModel.updateContactInquiryStatus(
      id, 
      status, 
      adminNotes
    );
    
    return updatedInquiry;
  } catch (error) {
    throw new Error(`Failed to update inquiry status: ${error.message}`);
  }
}

export async function getInquiryStatsService() {
  try {
    return await contactModel.getInquiryStats();
  } catch (error) {
    throw new Error(`Failed to fetch inquiry stats: ${error.message}`);
  }
}