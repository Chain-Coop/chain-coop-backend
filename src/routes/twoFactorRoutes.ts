import { Router } from "express";
import { setup2FA, verify2FASetup, disable2FA } from "../controllers/twoFactorController";
import { authorize } from "../middlewares/authorization";

const router = Router();

/**
 * @swagger
 * /2fa/setup:
 *   post:
 *     summary: Initialize two-factor authentication (2FA) setup for a user
 *     tags: [Two-Factor Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 2FA setup initialized successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Scan the QR code with your authenticator app and verify using the code.
 *                 qrDataUrl:
 *                   type: string
 *                   example: data:image/png;base64,iVBORw0KGgoAAAANSUhEUgA...
 *                 manualCode:
 *                   type: string
 *                   example: JBSWY3DPEHPK3PXP
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /2fa/verify:
 *   post:
 *     summary: Verify the 2FA code and enable two-factor authentication for a user
 *     tags: [Two-Factor Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: 2FA verification successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: number
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: 2FA verification successful
 *       400:
 *         description: Invalid 2FA token or missing token
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /2fa/disable:
 *   post:
 *     summary: Disable two-factor authentication for a user
 *     tags: [Two-Factor Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Two-factor authentication disabled
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Two-factor authentication disabled
 *       400:
 *         description: Invalid or missing 2FA token
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */



router.post("/setup", authorize, setup2FA);
router.post("/verify", authorize, verify2FASetup);
router.post("/disable", authorize, disable2FA);

export default router;