// controllers/userController.js
import HttpStatus from "../constants/httpStatusCode.js";
import * as userService from "../services/userService.js";
import { successResponse, errorResponse } from "../utils/responseHandler.js";

export async function register(req, res) {
  try {
    const { name, email, password, phone, address } = req.body;
    const result = await userService.registerUser(name, email, password, phone, address);
    
    return successResponse(
      res, 
      result, 
      result.message || "User registered successfully", 
      HttpStatus.CREATED
    );
  } catch (error) {
    // Use the specific error message from userService
    return errorResponse(res, error, HttpStatus.BAD_REQUEST);
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;
    const result = await userService.loginUser(email, password);
    
    return successResponse(
      res, 
      result, 
      "Login successful", 
      HttpStatus.OK
    );
  } catch (error) {
    // Preserve the specific error messages from userService
    const statusCode = error.message.includes('incorrect') || 
                      error.message.includes('No account') ? 
                      HttpStatus.UNAUTHORIZED : HttpStatus.BAD_REQUEST;
    
    return errorResponse(res, error, statusCode);
  }
}

export async function getProfile(req, res) {
  try {
    const userId = req.user.id;
    const { includeOrders = 'false' } = req.query;
    
    const includeOrdersBool = includeOrders.toLowerCase() === 'true';
    const user = await userService.getUserById(userId, includeOrdersBool);
    
    return successResponse(
      res, 
      user, 
      "Profile retrieved successfully", 
      HttpStatus.OK
    );
  } catch (error) {
    return errorResponse(res, error, HttpStatus.NOT_FOUND);
  }
}

export async function updateProfile(req, res) {
  try {
    const userId = req.user.id;
    const updateData = req.body;
    
    const user = await userService.updateUserProfile(userId, updateData);
    
    return successResponse(
      res, 
      user, 
      "Profile updated successfully", 
      HttpStatus.OK
    );
  } catch (error) {
    return errorResponse(res, error, HttpStatus.BAD_REQUEST);
  }
}


export async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    const result = await userService.forgotPassword(email);
    
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
    const result = await userService.resetPassword(token, newPassword);
    
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

// Admin controllers
export async function getUsers(req, res) {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const result = await userService.getAllUsers(parseInt(page), parseInt(limit), search);
    
    return successResponse(
      res, 
      result, 
      "Users retrieved successfully", 
      HttpStatus.OK
    );
  } catch (error) {
    return errorResponse(res, error, HttpStatus.BAD_REQUEST);
  }
}

export async function toggleUserStatus(req, res) {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;
    
    const result = await userService.toggleUserActiveStatus(userId, isActive);
    
    return successResponse(
      res, 
      result, 
      result.message, 
      HttpStatus.OK
    );
  } catch (error) {
    return errorResponse(res, error, HttpStatus.BAD_REQUEST);
  }
}


export async function getUserById(req, res) {
  try {
    const { userId } = req.params;
    const { includeOrders = 'false' } = req.query; // Get query parameter
    
    const includeOrdersBool = includeOrders.toLowerCase() === 'true';
    
    const user = await userService.getUserById(userId, includeOrdersBool);
    
    return successResponse(
      res, 
      user, 
      "User retrieved successfully", 
      HttpStatus.OK
    );
  } catch (error) {
    return errorResponse(res, error, HttpStatus.NOT_FOUND);
  }
}

export async function getUserStats(req, res) {
  try {
    const stats = await userService.getUserStats();
    
    return successResponse(
      res, 
      stats, 
      "User stats retrieved successfully", 
      HttpStatus.OK
    );
  } catch (error) {
    return errorResponse(res, error, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}