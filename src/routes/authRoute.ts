import { Router } from "express";
import {
	register,
	forgetPassword,
	login,
	resetPassword,
	verifyOtp,
	resendOtp,
	getUser,
	resendOtpWhatsApp,
	verifyOtpWA,
	changePhoneNumber,
} from "../controllers/authController";
import { authorize, authorizePermissions } from "../middlewares/authorization";
const router = Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication and Authorization routes
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 example: Password123
 *               firstName:
 *                 type: string
 *                 example: John
 *               lastName:
 *                 type: string
 *                 example: Doe
 *               phoneNumber:
 *                 type: string
 *                 example: "+1234567890"
 *               membershipType:
 *                 type: string
 *                 enum: [Explorer, Voyager, Pioneer]
 *                 example: Explorer
 *               username:
 *                 type: string
 *                 example: john_doe
 *     responses:
 *       201:
 *         description: Registration successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 msg:
 *                   type: string
 *                   example: Registration successful, enter the OTP sent to your email
 *                 user:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     token:
 *                       type: string
 *       409:
 *         description: Email already exists
 *       400:
 *         description: Invalid input data
 */

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login a user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 example: Password123
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                 email:
 *                   type: string
 *                 token:
 *                   type: string
 *                 role:
 *                   type: string
 *                   example: user
 *                 membershipStatus:
 *                   type: string
 *                   example: active
 *                 membershipPaymentStatus:
 *                   type: string
 *                   example: paid
 *       401:
 *         description: Invalid credentials
 */

/**
 * @swagger
 * /auth/verify_otp:
 *   post:
 *     summary: Verify OTP for account activation
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@example.com
 *               otp:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Account activated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 msg:
 *                   type: string
 *                   example: Your account has been activated
 *                 newUser:
 *                   type: object
 *       401:
 *         description: Invalid OTP
 *       404:
 *         description: User not found
 */

/**
 * @swagger
 * /auth/verify_whatsapp_otp:
 *   post:
 *     summary: Verify OTP sent to WhatsApp phone number
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 example: "680fb59bc7456789"
 *               phoneNumber:
 *                 type: string
 *                 example: "08456789789"
 *               otp:
 *                 type: string
 *                 example: "889205"
 *     responses:
 *       200:
 *         description: WhatsApp phone number verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 msg:
 *                   type: string
 *                   example: WhatsApp phone number verified successfully
 *       400:
 *         description: Invalid OTP or user not found
 */

/**
 * @swagger
 * /auth/resend_otp:
 *   post:
 *     summary: Resend OTP for email verification
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@example.com
 *     responses:
 *       201:
 *         description: OTP successfully sent
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 msg:
 *                   type: string
 *                   example: OTP successfully sent to your email
 *       404:
 *         description: User not found
 */

/**
 * @swagger
 * /auth/resend_whatsapp_otp:
 *   post:
 *     summary: Resend OTP to user's WhatsApp phone number
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phoneNumber:
 *                 type: string
 *                 example: "084567890"
 *     responses:
 *       200:
 *         description: OTP resent successfully to WhatsApp
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 msg:
 *                   type: string
 *                   example: OTP resent successfully to WhatsApp
 *       404:
 *         description: Phone number not found
 */


/**
 * @swagger
 * /auth/forget_password:
 *   post:
 *     summary: Send OTP for password reset
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@example.com
 *     responses:
 *       200:
 *         description: Password reset OTP sent
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 msg:
 *                   type: string
 *                   example: Password reset OTP sent to your email
 *       404:
 *         description: User not found
 */

/**
 * @swagger
 * /auth/reset_password:
 *   post:
 *     summary: Reset password using OTP
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@example.com
 *               otp:
 *                 type: string
 *                 example: "123456"
 *               password:
 *                 type: string
 *                 example: NewPassword123
 *               confirmPassword:
 *                 type: string
 *                 example: NewPassword123
 *     responses:
 *       200:
 *         description: Password reset successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 msg:
 *                   type: string
 *                   example: Password reset successful
 *       400:
 *         description: Invalid OTP or mismatched passwords
 *       404:
 *         description: User not found
 */

/**
 * @swagger
 * /auth/user:
 *   get:
 *     summary: Get user details and wallet information
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User details retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                 email:
 *                   type: string
 *                 isPinCreated:
 *                   type: boolean
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /auth/change_phone_number:
 *   put:
 *     summary: Change user's phone number after OTP verification
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 example: "680fb59bc7134567890"
 *               otp:
 *                 type: string
 *                 example: "379944"
 *               newPhoneNumber:
 *                 type: string
 *                 example: "087546789"
 *     responses:
 *       200:
 *         description: Phone number updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 msg:
 *                   type: string
 *                   example: Phone number updated successfully
 *       400:
 *         description: Invalid OTP or user not found
 */

router.post("/register", register);
router.get("/user", authorize, getUser);
router.post("/verify_otp", verifyOtp);
router.post("/verify_whatsapp_otp", verifyOtpWA);
router.post("/resend_otp", resendOtp);
router.post("/resend_whatsapp_otp", resendOtpWhatsApp);
router.post("/login", login);
router.post("/forget_password", forgetPassword);
router.post("/reset_password", resetPassword);
router.put("/change_phone_number", changePhoneNumber)

router.patch("/reactivate/:id", authorize, authorizePermissions("admin"));

export default router;
