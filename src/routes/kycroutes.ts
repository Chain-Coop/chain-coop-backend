import { Router } from "express";
import {
  sendOTP,
  setBVNController,
  verifyBVNController,
  verifyOTPController,
} from "../controllers/kycontroller";
import { authorize } from "../middlewares/authorization";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: KYC
 *   description: KYC management
 */

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * /kyc/send-otp:
 *   post:
 *     summary: Send OTP to user's phone number
 *     tags: [KYC]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *       404:
 *         description: User not found
 *       500:
 *         description: Failed to send OTP
 */

/**
 * @swagger
 * /kyc/verify-otp:
 *   post:
 *     summary: Verify OTP sent to user's phone number
 *     tags: [KYC]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *                 description: OTP code
 *     responses:
 *       200:
 *         description: OTP verified successfully
 *       404:
 *         description: User not found
 *       500:
 *         description: Failed to verify OTP
 */

/**
 * @swagger
 * /kyc/set-bvn:
 *   post:
 *     summary: Set user's BVN
 *     tags: [KYC]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               bvn:
 *                 type: string
 *                 description: User's BVN
 *     responses:
 *       200:
 *         description: BVN set successfully
 *       500:
 *         description: Failed to set BVN
 */

/**
 * @swagger
 * /kyc/verify-bvn:
 *   post:
 *     summary: Verify user's BVN
 *     tags: [KYC]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               countryCode:
 *                 type: string
 *                 description: Country code
 *               type:
 *                 type: string
 *                 description: Type of verification
 *               accountNumber:
 *                 type: string
 *                 description: Account number
 *               bankcode:
 *                 type: string
 *                 description: Bank code
 *     responses:
 *       200:
 *         description: BVN verified successfully
 *       404:
 *         description: User not found or BVN not set
 */

router.post("/send-otp", authorize, sendOTP);
router.post("/verify-otp", authorize, verifyOTPController);
router.post("/set-bvn", authorize, setBVNController);
router.post("/verify-bvn", authorize, verifyBVNController);

export default router;
