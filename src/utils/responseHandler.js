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
    console.error('API Error:', {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
    });

    let message = error.message || error;

    // Only hide internal errors in production
    if (process.env.NODE_ENV === 'production' && !message.startsWith("Registration failed")) {
        message = "An unexpected error occurred. Please try again later.";
    }

    const response = {
        success: false,
        message,
        timestamp: new Date().toISOString(),
        status
    };

    if (error.errors) {
        response.errors = error.errors;
    }

    return res.status(status).json(response);
}
