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
  /api/v1/savingcircle/create:
    post:
      summary: Create a new saving circle
      consumes:
        - multipart/form-data
      parameters:
        - name: name
          in: formData
          required: true
          type: string
        - name: description
          in: formData
          required: true
          type: string
        - name: depositAmount
          in: formData
          required: true
          type: number
        - name: currency
          in: formData
          required: true
          type: string
        - name: savingFrequency
          in: formData
          required: true
          type: string
          enum: [Daily, Weekly, Monthly]
        - name: goalAmount
          in: formData
          required: true
          type: number
        - name: groupType
          in: formData
          required: true
          type: string
          enum: [open, closed]
        - name: startDate
          in: formData
          required: true
          type: string
          format: date-time
        - name: endDate
          in: formData
          required: true
          type: string
          format: date-time
        - name: userId
          in: formData
          required: true
          type: string
        - name: image
          in: formData
          required: false
          type: file
      responses:
        201:
          description: Saving circle created successfully
        400:
          description: Bad request

 */

/**
 * @swagger
  /api/v1/savingcircle/initialize:
    post:
      summary: Initialize a payment for a saving circle
      consumes:
        - application/json
      parameters: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                circleId:
                  type: string
                  example: "680fd6c2aa5f30e884a11b872"
                userId:
                  type: string
                  example: "6807c036a0425f6d2dee9220"
                depositAmount:
                  type: number
                  example: 3400
                paymentType:
                  type: string
                  enum: [paystack, card]
      responses:
        200:
          description: Payment initialized successfully
        400:
          description: Invalid request or payment type
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
router.get("/verify", verifyContribution);
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