import { Router } from "express";
import {
  sendOTP,
  sendWhatsappOTPController,
  //setBVNController,
  //verifyBVNController,
  verifyOTPController,
  verifyWhatsappOTPController,
  initiateTier2Kyc,
  handleKycCallback
} from "../controllers/kycontroller";
import { verifyBVNBooleanMatchController } from '../controllers/bvnController';
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

/**
 * @swagger
 * /api/v1/kyc/tier2/{userId}:
 *   post:
 *     summary: Initiate Tier 2 KYC Session
 *     description: Creates a new Tier 2 KYC session for a user using the Didit API.
 *     tags:
 *       - KYC
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB user ID to initiate KYC for
 *     responses:
 *       200:
 *         description: KYC session created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: KYC Tier 1 session created successfully
 *                 verificationUrl:
 *                   type: string
 *                   example: https://verification.didit.me/session/xyz
 *       400:
 *         description: Invalid request (e.g. user not Tier 0)
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/v1/kyc/callback:
 *   post:
 *     summary: Handle KYC Callback Webhook
 *     description: Receives and processes the callback from Didit when a user's KYC session is completed.
 *     tags:
 *       - KYC
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *               - vendor_data
 *               - session_id
 *             properties:
 *               status:
 *                 type: string
 *                 example: verified
 *               vendor_data:
 *                 type: string
 *                 description: The user ID associated with the session
 *                 example: 66155b0128a7b94cf7c1222f
 *               session_id:
 *                 type: string
 *                 description: Unique session ID from Didit
 *                 example: kyc_sess_abc123
 *     responses:
 *       200:
 *         description: KYC status processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: User KYC verification processed successfully
 *       500:
 *         description: Webhook processing failed
 */


router.post("/send-otp", authorize, sendOTP);
router.post("/verify-otp", authorize, verifyOTPController);
//router.post("/set-bvn", authorize, setBVNController);
router.post("/verify-bvn/",authorize, verifyBVNBooleanMatchController);
router.post("/sendwaotp", authorize, sendWhatsappOTPController);
router.post("/verifywaotp", authorize, verifyWhatsappOTPController);
router.post("/callback", handleKycCallback);
//router.get('/status', authorize, checkBVNStatusController);

//TIER 2 Verification routes
router.post('/tier2/:userId', initiateTier2Kyc);

export default router;
