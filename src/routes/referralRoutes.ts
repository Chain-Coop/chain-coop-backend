import { Router } from "express";
import {
  getMyReferrals,
  checkReferralCode,
  getAllReferralsAdmin,
  getReferralConfig,
  getReferralCode,
  getClaimableReferralsController,
  claimSingleReward,
  claimAllRewards,
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
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /referrals/claimable:
 *   get:
 *     summary: Get claimable referrals for the current user
 *     tags: [Referrals]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Claimable referrals retrieved successfully
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
 *                   example: Claimable referrals retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     claimableReferrals:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: 507f1f77bcf86cd799439011
 *                           referee:
 *                             type: object
 *                             properties:
 *                               username:
 *                                 type: string
 *                                 example: jane_smith
 *                               email:
 *                                 type: string
 *                                 example: jane.smith@example.com
 *                           rewardAmount:
 *                             type: number
 *                             example: 1000
 *                           fundingAmount:
 *                             type: number
 *                             example: 5000
 *                           completedAt:
 *                             type: string
 *                             format: date-time
 *                     totalClaimableAmount:
 *                       type: number
 *                       example: 3000
 *                     count:
 *                       type: number
 *                       example: 3
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /referrals/claim/{referralId}:
 *   post:
 *     summary: Claim a single referral reward
 *     tags: [Referrals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: referralId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the referral to claim
 *     responses:
 *       200:
 *         description: Referral reward claimed successfully
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
 *                   example: Referral reward claimed successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     rewardAmount:
 *                       type: number
 *                       example: 1000
 *                     newBalance:
 *                       type: number
 *                       example: 15000
 *       400:
 *         description: Invalid referral ID or already claimed
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Claimable referral not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /referrals/claim-all:
 *   post:
 *     summary: Claim all available referral rewards at once
 *     tags: [Referrals]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All referral rewards claimed successfully
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
 *                   example: All referral rewards claimed successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalRewardAmount:
 *                       type: number
 *                       example: 3000
 *                     claimedCount:
 *                       type: number
 *                       example: 3
 *                     newBalance:
 *                       type: number
 *                       example: 18000
 *       400:
 *         description: No claimable referrals found
 *       401:
 *         description: Unauthorized
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
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, claimable, completed, expired]
 *     responses:
 *       200:
 *         description: Referrals retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied. Admin only
 *       500:
 *         description: Internal server error
 */

// Public routes
router.get("/validate", checkReferralCode);
router.get("/config", getReferralConfig);
router.get("/my-referrals", authorize, getMyReferrals);
router.get("/my-code", authorize, getReferralCode);
router.get("/claimable", authorize, getClaimableReferralsController);
router.post("/claim/:referralId", authorize, claimSingleReward);
router.post("/claim-all", authorize, claimAllRewards);

// Admin routes
router.get("/admin/all", authorize,  authorizePermissions("admin"), getAllReferralsAdmin);

export default router;