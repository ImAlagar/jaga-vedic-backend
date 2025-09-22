// middlewares/authToken.js
import jwt from "jsonwebtoken";
import { errorResponse } from "../utils/responseHandler.js";
import HttpStatus from "../constants/httpStatusCode.js";

export function verifyAdminToken(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return errorResponse(res, "Access token required", HttpStatus.UNAUTHORIZED);
        }

        const token = authHeader.split(' ')[1];
        
        if (!token) {
            return errorResponse(res, "Invalid token format", HttpStatus.UNAUTHORIZED);
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Additional checks (optional)
        if (!decoded.id || !decoded.email || !decoded.role) {
            return errorResponse(res, "Invalid token payload", HttpStatus.UNAUTHORIZED);
        }

        req.admin = decoded;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return errorResponse(res, "Token has expired", HttpStatus.UNAUTHORIZED);
        }
        
        if (error.name === 'JsonWebTokenError') {
            return errorResponse(res, "Invalid token", HttpStatus.UNAUTHORIZED);
        }
        
        return errorResponse(res, "Authentication failed", HttpStatus.INTERNAL_SERVER_ERROR);
    }
}