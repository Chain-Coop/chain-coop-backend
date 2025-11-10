import express from 'express';
import {
  initiateOnramp,
  processOnrampPayment,
  refundOnrampTransaction,
  getOnrampTxnById,
  getUserOnrampTxns,
} from '../../../controllers/web3/onramp/onrampController';

import { authorize, verifyPin } from '../../../middlewares/authorization';

const router = express.Router();

/**
 * @swagger
 * /web3/onramp/initiate:
 *   post:
 *     summary: Initiate onramp transaction
 *     description: Creates a new onramp transaction for converting Naira to cryptocurrency
 *     tags: [Onramp]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amountInNaira
 *               - cryptoCurrency
 *               - cryptoNetwork
 *             properties:
 *               amountInNaira:
 *                 type: number
 *                 description: The amount in Naira to convert
 *                 example: 10000
 *               cryptoCurrency:
 *                 type: string
 *                 description: The cryptocurrency to purchase
 *                 example: "usdt"
 *               cryptoNetwork:
 *                 type: string
 *                 description: The blockchain network for the transaction
 *                 example: "bsc"
 *     responses:
 *       201:
 *         description: Onramp transaction created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                   example: "507f1f77bcf86cd799439011"
 *                 userId:
 *                   type: string
 *                   example: "user123"
 *                 amountInNaira:
 *                   type: number
 *                   example: 10000
 *                 cryptoCurrency:
 *                   type: string
 *                   example: "usdt"
 *                 cryptoNetwork:
 *                   type: string
 *                   example: "bsc"
 *                 status:
 *                   type: string
 *                   example: "pending"
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                   example: "2025-09-29T12:00:00Z"
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *                   example: "2025-09-29T12:00:00Z"
 *       400:
 *         description: Missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Missing required fields"
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Error initiating onramp transaction"
 */

/**
 * @swagger
 * /web3/onramp/process/{onrampTransactionId}:
 *   post:
 *     summary: Process onramp payment
 *     description: Processes the onramp payment and transfers cryptocurrency to the user's wallet
 *     tags: [Onramp]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: onrampTransactionId
 *         required: true
 *         schema:
 *           type: string
 *         description: The onramp transaction ID to process
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Payment processed successfully and crypto transferred
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                   example: "507f1f77bcf86cd799439011"
 *                 userId:
 *                   type: string
 *                   example: "user123"
 *                 amountInNaira:
 *                   type: number
 *                   example: 10000
 *                 cryptoCurrency:
 *                   type: string
 *                   example: "usdt"
 *                 cryptoNetwork:
 *                   type: string
 *                   example: "bsc"
 *                 status:
 *                   type: string
 *                   example: "completed"
 *                 transactionHash:
 *                   type: string
 *                   example: "0xabc123..."
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                   example: "2025-09-29T12:00:00Z"
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *                   example: "2025-09-29T12:00:00Z"
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Error processing onramp payment"
 */

/**
 * @swagger
 * /web3/onramp/refund/{onrampTransactionId}:
 *   post:
 *     summary: Refund onramp transaction
 *     description: Refunds a failed or cancelled onramp transaction back to the user's wallet
 *     tags: [Onramp]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: onrampTransactionId
 *         required: true
 *         schema:
 *           type: string
 *         description: The onramp transaction ID to refund
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Refund processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                   example: "507f1f77bcf86cd799439011"
 *                 userId:
 *                   type: string
 *                   example: "user123"
 *                 amountInNaira:
 *                   type: number
 *                   example: 10000
 *                 cryptoCurrency:
 *                   type: string
 *                   example: "usdt"
 *                 cryptoNetwork:
 *                   type: string
 *                   example: "bsc"
 *                 status:
 *                   type: string
 *                   example: "refunded"
 *                 refundedAt:
 *                   type: string
 *                   format: date-time
 *                   example: "2025-09-29T13:00:00Z"
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                   example: "2025-09-29T12:00:00Z"
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *                   example: "2025-09-29T13:00:00Z"
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Error refunding onramp transaction"
 */

/**
 * @swagger
 * /web3/onramp/user:
 *   get:
 *     summary: Get all user onramp transactions
 *     description: Retrieves all onramp transactions for the authenticated user
 *     tags: [Onramp]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Transactions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                     example: "507f1f77bcf86cd799439011"
 *                   userId:
 *                     type: string
 *                     example: "user123"
 *                   amountInNaira:
 *                     type: number
 *                     example: 10000
 *                   cryptoCurrency:
 *                     type: string
 *                     example: "usdt"
 *                   cryptoNetwork:
 *                     type: string
 *                     example: "bsc"
 *                   status:
 *                     type: string
 *                     example: "completed"
 *                   transactionHash:
 *                     type: string
 *                     example: "0xabc123..."
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                     example: "2025-09-29T12:00:00Z"
 *                   updatedAt:
 *                     type: string
 *                     format: date-time
 *                     example: "2025-09-29T12:00:00Z"
 *       400:
 *         description: User ID is required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User ID is required"
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Error fetching user onramp transactions"
 */

/**
 * @swagger
 * /web3/onramp/{onrampTransactionId}:
 *   get:
 *     summary: Get specific onramp transaction details
 *     description: Retrieves details of a specific onramp transaction by ID
 *     tags: [Onramp]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: onrampTransactionId
 *         required: true
 *         schema:
 *           type: string
 *         description: The onramp transaction ID
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Transaction retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                   example: "507f1f77bcf86cd799439011"
 *                 userId:
 *                   type: string
 *                   example: "user123"
 *                 amountInNaira:
 *                   type: number
 *                   example: 10000
 *                 cryptoCurrency:
 *                   type: string
 *                   example: "usdt"
 *                 cryptoNetwork:
 *                   type: string
 *                   example: "bsc"
 *                 status:
 *                   type: string
 *                   example: "completed"
 *                 transactionHash:
 *                   type: string
 *                   example: "0xabc123..."
 *                 walletAddress:
 *                   type: string
 *                   example: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                   example: "2025-09-29T12:00:00Z"
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *                   example: "2025-09-29T12:00:00Z"
 *       404:
 *         description: Transaction not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Onramp transaction not found"
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Error fetching onramp transaction by ID"
 */

// Routes
router.post('/initiate', authorize, initiateOnramp);
router.post('/process/:onrampTransactionId', authorize, processOnrampPayment);
router.post('/refund/:onrampTransactionId', authorize, refundOnrampTransaction);

router.get('/user', authorize, getUserOnrampTxns);
router.get('/:onrampTransactionId', authorize, getOnrampTxnById);

export default router;
