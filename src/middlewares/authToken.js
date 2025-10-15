import jwt from "jsonwebtoken";
import { errorResponse } from "../utils/responseHandler.js";
import HttpStatus from "../constants/httpStatusCode.js";
import { isTokenBlacklisted } from "../utils/tokenBlacklist.js"; // Add this import

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

        // Check if token is blacklisted
        isTokenBlacklisted(token).then(isBlacklisted => {
            if (isBlacklisted) {
                return errorResponse(res, "Token has been invalidated. Please login again.", HttpStatus.UNAUTHORIZED);
            }

            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                
                // Additional checks
                if (!decoded.id || !decoded.email || !decoded.role) {
                    return errorResponse(res, "Invalid token payload", HttpStatus.UNAUTHORIZED);
                }

                req.admin = decoded;
                next();
            } catch (verifyError) {
                handleJWTError(verifyError, res);
            }
        }).catch(error => {
            console.error('Error checking token blacklist:', error);
            return errorResponse(res, "Authentication failed", HttpStatus.INTERNAL_SERVER_ERROR);
        });

    } catch (error) {
        return errorResponse(res, "Authentication failed", HttpStatus.INTERNAL_SERVER_ERROR);
    }
}

export function verifyUserToken(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return errorResponse(res, "Access token required", HttpStatus.UNAUTHORIZED);
        }

        const token = authHeader.split(' ')[1];
        
        if (!token) {
            return errorResponse(res, "Invalid token format", HttpStatus.UNAUTHORIZED);
        }

        // Check if token is blacklisted
        isTokenBlacklisted(token).then(isBlacklisted => {
            if (isBlacklisted) {
                return errorResponse(res, "Token has been invalidated. Please login again.", HttpStatus.UNAUTHORIZED);
            }

            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                
                // Check if it's a user token
                if (decoded.type !== 'user') {
                    return errorResponse(res, "Invalid token type", HttpStatus.UNAUTHORIZED);
                }

                if (!decoded.id || !decoded.email) {
                    return errorResponse(res, "Invalid token payload", HttpStatus.UNAUTHORIZED);
                }

                req.user = decoded;
                next();
            } catch (verifyError) {
                handleJWTError(verifyError, res);
            }
        }).catch(error => {
            console.error('Error checking token blacklist:', error);
            return errorResponse(res, "Authentication failed", HttpStatus.INTERNAL_SERVER_ERROR);
        });

    } catch (error) {
        return errorResponse(res, "Authentication failed", HttpStatus.INTERNAL_SERVER_ERROR);
    }
}

function handleJWTError(error, res) {
    if (error.name === 'TokenExpiredError') {
        return errorResponse(res, "Token has expired", HttpStatus.UNAUTHORIZED);
    }
    
    if (error.name === 'JsonWebTokenError') {
        return errorResponse(res, "Invalid token", HttpStatus.UNAUTHORIZED);
    }
    
    return errorResponse(res, "Authentication failed", HttpStatus.INTERNAL_SERVER_ERROR);
}