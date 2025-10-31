import { Router } from "express";
import {
  getMyReferrals,
  checkReferralCode,
  getAllReferralsAdmin,
  getReferralConfig,
  getReferralCode,
} from "../controllers/referralController";
import { authorize, authorizePermissions } from "../middlewares/authorization";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Referrals
 *   description: Referral management and tracking routes
 */

/**
 * @swagger
 * /referrals/validate:
 *   get:
 *     summary: Validate a referral code
 *     tags: [Referrals]
 *     parameters:
 *       - in: query
 *         name: referralCode
 *         required: true
 *         schema:
 *           type: string
 *           example: john_doe
 *         description: The referral code (username) to validate
 *     responses:
 *       200:
 *         description: Referral code validation result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Referral code is valid
 *                 data:
 *                   type: object
 *                   properties:
 *                     valid:
 *                       type: boolean
 *                       example: true
 *                     referrerUsername:
 *                       type: string
 *                       example: john_doe
 *       400:
 *         description: Invalid or missing referral code
 */

/**
 * @swagger
 * /referrals/config:
 *   get:
 *     summary: Get referral program configuration
 *     tags: [Referrals]
 *     responses:
 *       200:
 *         description: Referral configuration retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Referral configuration retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     rewardAmount:
 *                       type: number
 *                       example: 1000
 *                     minFundingAmount:
 *                       type: number
 *                       example: 5000
 *                     currency:
 *                       type: string
 *                       example: NGN
 *                     description:
 *                       type: string
 *                       example: Fund your wallet to earn referral rewards for your referrer
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /referrals/my-referrals:
 *   get:
 *     summary: Get current user's referral statistics and history
 *     tags: [Referrals]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Referral statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Referral statistics retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalReferrals:
 *                       type: number
 *                       example: 10
 *                     completedReferrals:
 *                       type: number
 *                       example: 6
 *                     pendingReferrals:
 *                       type: number
 *                       example: 2
 *                     totalEarnings:
 *                       type: number
 *                       example: 8000
 *                     referrals:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           userId:
 *                             type: string
 *                             example: 507f1f77bcf86cd799439011
 *                           username:
 *                             type: string
 *                             example: jane_smith
 *                           email:
 *                             type: string
 *                             example: jane.smith@example.com
 *                           status:
 *                             type: string
 *                             example: active
 *                           dateReferred:
 *                             type: string
 *                             format: date-time
 *                             example: 2025-10-15T08:30:00Z
 *                           rewardEarned:
 *                             type: number
 *                             example: 1000
 *                           fundingAmount:
 *                             type: number
 *                             example: 5000
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /referrals/my-code:
 *   get:
 *     summary: Get user's referral code and link
 *     tags: [Referrals]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Referral code retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Referral code retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     referralCode:
 *                       type: string
 *                       example: john_doe
 *                     referralLink:
 *                       type: string
 *                       example: https://example.com/sign-up?ref=john_doe
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /referrals/admin/all:
 *   get:
 *     summary: Get all referrals (Admin only)
 *     tags: [Referrals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *           example: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           example: 20
 *         description: Number of items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           example: active
 *         description: Filter by referral status
 *     responses:
 *       200:
 *         description: Referrals retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Referrals retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     referrals:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           userId:
 *                             type: string
 *                           username:
 *                             type: string
 *                           email:
 *                             type: string
 *                           status:
 *                             type: string
 *                           dateReferred:
 *                             type: string
 *                             format: date-time
 *                           rewardEarned:
 *                             type: number
 *                           fundingAmount:
 *                             type: number
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         currentPage:
 *                           type: number
 *                           example: 1
 *                         totalPages:
 *                           type: number
 *                           example: 5
 *                         totalItems:
 *                           type: number
 *                           example: 100
 *                         itemsPerPage:
 *                           type: number
 *                           example: 20
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied. Admin only
 *       500:
 *         description: Internal server error
 */

router.get("/validate", checkReferralCode);
router.get("/config", getReferralConfig);
router.get("/my-referrals", authorize, getMyReferrals);
router.get("/my-code", authorize, getReferralCode);
router.get("/admin/all", authorize,  authorizePermissions("admin"),getAllReferralsAdmin);

export default router;