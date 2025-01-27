import { Router, Request, Response } from "express";
import {
  createContribution,
  withdrawContribution,
  deleteAllContributions,
  getTotalBalance,
  verifyContribution,
  getContributionsById,
  chargeCardforContribution,
  newgetContributionHistory,
  getUserContributions,
  attemptPayment,
  getPendingContributions,
  getUnpaidContributions,
  chargeforUnpaidContributions,
  verifyUnpaidPayment,
} from "../controllers/contributionController";
import { authorize } from "../middlewares/authorization";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Contributions
 *   description: Contribution related operations
 */

/**
 * @swagger
 * /api/contribute:
 *   post:
 *     summary: Create a new contribution
 *     tags: [Contributions]
 *     requestBody:
 *       description: Data to create a new contribution
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               user:
 *                 type: string
 *                 description: User ID
 *               contributionPlan:
 *                 type: string
 *                 description: Contribution plan (e.g., monthly, weekly)
 *               amount:
 *                 type: number
 *                 description: Contribution amount
 *               currency:
 *                 type: string
 *                 description: Currency for the contribution (e.g., USD, EUR, GBP)
 *               savingsCategory:
 *                 type: string
 *                 description: Savings category
 *               startDate:
 *                 type: string
 *                 format: date
 *                 description: Contribution start date
 *               endDate:
 *                 type: string
 *                 format: date
 *                 description: Contribution end date
 *               email:
 *                 type: string
 *                 description: User's email address
 *     responses:
 *       201:
 *         description: Contribution created successfully
 *       400:
 *         description: Invalid request data
 */

/**
 * @swagger
 * /api/contribute:
 *   get:
 *     summary: Get contributions of a user
 *     tags: [Contributions]
 *     responses:
 *       200:
 *         description: Contributions found
 *       404:
 *         description: Contributions not found
 */

/**
 * @swagger
 * /api/history:
 *   get:
 *     summary: Get contribution history
 *     tags: [Contributions]
 *     responses:
 *       200:
 *         description: Contribution history found
 *       404:
 *         description: History not found
 */

/**
 * @swagger
 * /api/balance:
 *   get:
 *     summary: Get total balance of all contributions
 *     tags: [Contributions]
 *     responses:
 *       200:
 *         description: Total balance fetched successfully
 */

/**
 * @swagger
 * /api/withdraw:
 *   post:
 *     summary: Withdraw a contribution
 *     tags: [Contributions]
 *     requestBody:
 *       description: Contribution withdrawal details
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               contributionId:
 *                 type: string
 *                 description: Contribution ID to withdraw
 *               currency:
 *                 type: string
 *                 description: Currency for the withdrawal (e.g., USD, EUR, GBP)
 *     responses:
 *       200:
 *         description: Contribution withdrawn successfully
 *       400:
 *         description: Invalid request
 */

/**
 * @swagger
 * /api/verify-contribution:
 *   get:
 *     summary: Verify a contribution
 *     tags: [Contributions]
 *     responses:
 *       200:
 *         description: Contribution verified successfully
 *       404:
 *         description: Contribution not found
 */

/**
 * @swagger
 * /api/category/{id}:
 *   get:
 *     summary: Get contributions by category ID
 *     tags: [Contributions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Contribution category ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Contributions found
 *       404:
 *         description: Contributions not found
 */

/**
 * @swagger
 * /api/delete:
 *   delete:
 *     summary: Delete all contributions
 *     tags: [Contributions]
 *     responses:
 *       200:
 *         description: All contributions deleted
 */

/**
 * @swagger
 * /api/pay-contribution:
 *   post:
 *     summary: Charge a card for a contribution
 *     tags: [Contributions]
 *     requestBody:
 *       description: Card details for contribution payment
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cardData:
 *                 type: string
 *                 description: Card data for payment
 *               currency:
 *                 type: string
 *                 description: Currency for the charge (e.g., USD, EUR, GBP)
 *     responses:
 *       200:
 *         description: Card charged successfully
 *       400:
 *         description: Invalid card data
 */

/**
 * @swagger
 * /api/pending:
 *   get:
 *     summary: Get pending contributions
 *     tags: [Contributions]
 *     responses:
 *       200:
 *         description: Pending contributions found
 *       404:
 *         description: No pending contributions found
 */

/**
 * @swagger
 * /api/pay:
 *   post:
 *     summary: Attempt payment for a contribution
 *     tags: [Contributions]
 *     requestBody:
 *       description: Payment attempt details
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               currency:
 *                 type: string
 *                 description: Currency for the payment (e.g., USD, EUR, GBP)
 *     responses:
 *       200:
 *         description: Payment attempt successful
 *       400:
 *         description: Payment attempt failed
 */

/**
 * @swagger
 * /api/unpaid:
 *   get:
 *     summary: Get unpaid contributions
 *     tags: [Contributions]
 *     responses:
 *       200:
 *         description: Unpaid contributions found
 *       404:
 *         description: No unpaid contributions found
 */

/**
 * @swagger
 * /api/charge-unpaid:
 *   post:
 *     summary: Charge unpaid contributions
 *     tags: [Contributions]
 *     requestBody:
 *       description: Card details for charging unpaid contributions
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cardData:
 *                 type: string
 *                 description: Card data for payment
 *               currency:
 *                 type: string
 *                 description: Currency for the charge (e.g., USD, EUR, GBP)
 *     responses:
 *       200:
 *         description: Unpaid contributions charged successfully
 *       400:
 *         description: Invalid card data or unpaid contribution ID
 */

/**
 * @swagger
 * /api/verify-unpaid:
 *   get:
 *     summary: Verify unpaid contribution payment
 *     tags: [Contributions]
 *     responses:
 *       200:
 *         description: Unpaid contribution verified
 *       404:
 *         description: Unpaid contribution not found
 */

router.post("/contribute", authorize, createContribution);
router.get("/contribute", authorize, getUserContributions);
router.get("/history", authorize, newgetContributionHistory);
router.get("/balance", authorize, getTotalBalance);
router.post("/withdraw", authorize, withdrawContribution);
router.get("/verify-contribution", verifyContribution);
router.get("/category/:id", authorize, getContributionsById);
router.delete("/delete", deleteAllContributions);
router.route("/pay-contribution").post(authorize, chargeCardforContribution);
router.route("/pending").get(authorize, getPendingContributions);

router.route("/pay").post(authorize, attemptPayment);

// Unpaid contributions
router.route("/unpaid").get(authorize, getUnpaidContributions);
router.route("/charge-unpaid").post(authorize, chargeforUnpaidContributions);
router.route("/verify-unpaid").get(authorize, verifyUnpaidPayment);

export default router;