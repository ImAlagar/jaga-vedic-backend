// controllers/adminController.js
import HttpStatus from "../constants/httpStatusCode.js";
import * as adminService from "../services/adminService.js";
import { successResponse, errorResponse } from "../utils/responseHandler.js";

export async function register(req, res) {
  try {
    const { email, password } = req.body;
    const admin = await adminService.registerAdmin(email, password);
    
    return successResponse(
      res, 
      admin, 
      "Admin account created successfully", 
      HttpStatus.CREATED
    );
  } catch (error) {
    return errorResponse(res, error, HttpStatus.BAD_REQUEST);
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;
    const result = await adminService.loginAdmin(email, password);
    
    return successResponse(
      res, 
      result, 
      "Login successful", 
      HttpStatus.OK
    );
  } catch (error) {
    return errorResponse(res, error, HttpStatus.UNAUTHORIZED);
  }
}

export async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    
    if (!email) {
      return errorResponse(res, "Email is required", HttpStatus.BAD_REQUEST);
    }
    
    const result = await adminService.forgotPassword(email);
    
    return successResponse(
      res, 
      null, 
      result.message, 
      HttpStatus.OK
    );
  } catch (error) {
    return errorResponse(res, error, HttpStatus.BAD_REQUEST);
  }
}

export async function resetPassword(req, res) {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return errorResponse(
        res, 
        "Token and new password are required", 
        HttpStatus.BAD_REQUEST
      );
    }
    
    const result = await adminService.resetPassword(token, newPassword);
    
    return successResponse(
      res, 
      null, 
      result.message, 
      HttpStatus.OK
    );
  } catch (error) {
    return errorResponse(res, error, HttpStatus.BAD_REQUEST);
  }
}