// src/controllers/contactController.js
import HttpStatus from "../constants/httpStatusCode.js";
import * as contactService from "../services/contactService.js";
import { successResponse, errorResponse } from "../utils/responseHandler.js";

export async function submitContact(req, res) {
  try {
    const {
      name,
      email,
      subject,
      message,
      inquiryType = 'GENERAL',
      phone,
    } = req.body;

    const inquiryData = {
      name,
      email,
      subject,
      message,
      inquiryType,
      phone,
    };

    const inquiry = await contactService.submitContactInquiry(inquiryData);
    
    return successResponse(
      res, 
      { 
        id: inquiry.id,
        message: "Your inquiry has been submitted successfully. We'll get back to you within 24 hours."
      }, 
      "Inquiry submitted successfully", 
      HttpStatus.CREATED
    );
  } catch (error) {
    return errorResponse(res, error.message, HttpStatus.BAD_REQUEST);
  }
}

export async function getAllInquiries(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status || null;

    const result = await contactService.getAllInquiriesService(page, limit, status);
    
    return successResponse(
      res, 
      result, 
      "Inquiries fetched successfully", 
      HttpStatus.OK
    );
  } catch (error) {
    return errorResponse(res, error.message, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

export async function getInquiryById(req, res) {
  try {
    const { id } = req.params;
    
    const inquiry = await contactService.getInquiryByIdService(id);
    
    return successResponse(
      res, 
      inquiry, 
      "Inquiry fetched successfully", 
      HttpStatus.OK
    );
  } catch (error) {
    return errorResponse(res, error.message, HttpStatus.NOT_FOUND);
  }
}

export async function updateInquiryStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;
    
    const updatedInquiry = await contactService.updateInquiryStatusService(
      id, 
      status, 
      adminNotes
    );
    
    return successResponse(
      res, 
      updatedInquiry, 
      "Inquiry status updated successfully", 
      HttpStatus.OK
    );
  } catch (error) {
    return errorResponse(res, error.message, HttpStatus.BAD_REQUEST);
  }
}

export async function getInquiryStats(req, res) {
  try {
    const stats = await contactService.getInquiryStatsService();
    
    return successResponse(
      res, 
      stats, 
      "Inquiry statistics fetched successfully", 
      HttpStatus.OK
    );
  } catch (error) {
    return errorResponse(res, error.message, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}