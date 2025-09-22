// utils/responseHandler.js
import HttpStatus from "../constants/httpStatusCode.js";

export function successResponse(res, data = null, message = "Operation completed successfully", status = HttpStatus.OK) {
    const response = {
        success: true,
        message,
        timestamp: new Date().toISOString(),
        status
    };
    
    if (data) {
        response.data = data;
    }
    
    return res.status(status).json(response);
}

export function errorResponse(res, error, status = HttpStatus.BAD_REQUEST) {
    // Log error for server-side monitoring
    console.error('API Error:', {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
    });
    
    const response = {
        success: false,
        message: process.env.NODE_ENV === 'production' 
            ? 'An unexpected error occurred. Please try again later.' 
            : error.message || error,
        timestamp: new Date().toISOString(),
        status
    };
    
    // Include validation errors if available
    if (error.errors) {
        response.errors = error.errors;
    }
    
    return res.status(status).json(response);
}