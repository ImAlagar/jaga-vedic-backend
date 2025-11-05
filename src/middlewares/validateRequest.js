import { validationResult } from "express-validator"; 

// In your validateRequest middleware
export function validateRequest(req, res, next) {
    const errors = validationResult(req);
    if(!errors.isEmpty()) {
        console.log('❌ [VALIDATION] Validation errors:', {
            method: req.method,
            url: req.url,
            body: req.body,
            errors: errors.array()
        });
        return res.status(422).json({
            success:  false,
            message: "Validation failed",
            errors: errors.array(),
        });
    }

    next();
}