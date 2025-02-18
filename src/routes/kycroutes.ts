import { Router } from "express";
import {
  sendOTP,
  sendWhatsappOTPController,
  setBVNController,
  verifyBVNController,
  verifyOTPController,
  verifyWhatsappOTPController,
  initiateTier2Kyc
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
 *               reference:
 *                 type: string
 *                 description: Reference code
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

/**
 * @swagger
 * /kyc/sendwaotp:
 *   post:
 *     summary: Send OTP via WhatsApp
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
 * /kyc/verifywaotp:
 *   post:
 *     summary: Verify OTP sent via WhatsApp
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
 *                 description: OTP code received via WhatsApp
 *     responses:
 *       200:
 *         description: OTP verified successfully
 *       404:
 *         description: User not found
 *       500:
 *         description: Failed to verify OTP
 */

router.post("/send-otp", authorize, sendOTP);
router.post("/verify-otp", authorize, verifyOTPController);
router.post("/set-bvn", authorize, setBVNController);
router.post("/verify-bvn", authorize, verifyBVNController);
router.post("/sendwaotp", authorize, sendWhatsappOTPController);
router.post("/verifywaotp", authorize, verifyWhatsappOTPController);

//TIER 2 Verification routes
router.post('/tier1/:userId', initiateTier2Kyc);

export default router;
