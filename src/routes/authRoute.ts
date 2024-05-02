import { Router } from "express";
import {
	register,
	forgetPassword,
	login,
	resetPassword,
	verifyOtp,
	resendOtp,
	getUser,
} from "../controllers/authController";
import { authorize, authorizePermissions } from "../middlewares/authorization";
const router = Router();

router.post("/register", register);
router.get("/user", authorize, getUser);
router.post("/verify_otp", verifyOtp);
router.post("/resend_otp", resendOtp);
router.post("/login", login);
router.post("/forget_password", forgetPassword);
router.post("/reset_password", resetPassword);

router.patch("/reactivate/:id", authorize, authorizePermissions("admin"));

export default router;
