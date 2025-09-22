import express from "express";
import { forgotPassword, login, register, resetPassword } from "../controllers/adminController.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { loginValidator, registerValidator, resetValidator } from "../validators/adminValidator.js";
import { verifyAdminToken } from "../middlewares/authToken.js";


const router = express.Router();

router.post("/register", registerValidator, validateRequest, register);
router.post("/login", loginValidator, validateRequest, login );
router.post("/forgot-password", validateRequest, forgotPassword);
router.post("/reset-password", resetValidator, validateRequest, resetPassword);

router.get("/dashboard", verifyAdminToken, (req, res) => {
    res.json({
        success: true,
        message : "Welcome to Admin Dashboard",
        admin : req.admin
    })
})


export default router;