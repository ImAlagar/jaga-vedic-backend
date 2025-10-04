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
    // ALWAYS return the specific error message
    const message = error.message || error;

    const response = {
        success: false,
        message, // This will be "Invalid email or password" etc.
        timestamp: new Date().toISOString(),
        status
    };

    if (error.errors) {
        response.errors = error.errors;
    }

    return res.status(status).json(response);
}