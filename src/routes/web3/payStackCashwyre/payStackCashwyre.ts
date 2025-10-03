import { Router } from 'express';
import { authorize } from '../../../middlewares/authorization';
import {
  initiateCryptoPayment,
  initiateNewTransfer,
  transactionDetails,
  transactionDetail,
} from '../../../controllers/paystackController/paystackController';

const router = Router();

/**
 * @swagger
 * /web3/paystack/crypto/initialize:
 *   post:
 *     summary: Initialize crypto payment
 *     description: Initializes a payment transaction for cryptocurrency wallet funding via Paystack or stored card
 *     tags: [Paystack Crypto]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - paymentMethod
 *               - crypto
 *               - network
 *             properties:
 *               amount:
 *                 type: number
 *                 description: The amount in Naira to fund the wallet
 *                 example: 10000
 *               paymentMethod:
 *                 type: string
 *                 enum: [card, paystack]
 *                 description: Payment method to use (card for saved card, paystack for new payment)
 *                 example: "paystack"
 *               crypto:
 *                 type: string
 *                 description: The cryptocurrency to purchase
 *                 example: "usdt"
 *               network:
 *                 type: string
 *                 description: The blockchain network for the transaction
 *                 example: "bsc"
 *     responses:
 *       200:
 *         description: Payment initialized successfully
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
 *                   example: "Payment initiated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     authorization_url:
 *                       type: string
 *                       example: "https://checkout.paystack.com/abc123"
 *                     access_code:
 *                       type: string
 *                       example: "abc123xyz"
 *                     reference:
 *                       type: string
 *                       example: "ref_abc123xyz"
 *       400:
 *         description: Bad Request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Amount, payment method, crypto, and network are required"
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Failed to initialize payment"
 */

/**
 * @swagger
 * /web3/paystack/crypto/transfer/new:
 *   post:
 *     summary: Initiate new crypto transfer
 *     description: Creates a new transaction and initiates a bank transfer to Cashwyre for crypto purchase
 *     tags: [Paystack Crypto]
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
 *               - crypto
 *               - network
 *             properties:
 *               amountInNaira:
 *                 type: number
 *                 description: The amount in Naira to transfer for crypto purchase
 *                 example: 10000
 *               crypto:
 *                 type: string
 *                 description: The cryptocurrency to purchase
 *                 example: "usdt"
 *               network:
 *                 type: string
 *                 description: The blockchain network for the transaction
 *                 example: "bsc"
 *     responses:
 *       200:
 *         description: Transfer initiated successfully
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
 *                   example: "Transfer initiated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     integration:
 *                       type: number
 *                       example: 100032
 *                     domain:
 *                       type: string
 *                       example: "live"
 *                     amount:
 *                       type: number
 *                       example: 1000000
 *                     currency:
 *                       type: string
 *                       example: "NGN"
 *                     source:
 *                       type: string
 *                       example: "balance"
 *                     reason:
 *                       type: string
 *                       example: "Transfer to Cashwyre account TX123456789"
 *                     recipient:
 *                       type: number
 *                       example: 28
 *                     status:
 *                       type: string
 *                       example: "pending"
 *                     transfer_code:
 *                       type: string
 *                       example: "TRF_abc123xyz"
 *                     id:
 *                       type: number
 *                       example: 14
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-09-29T12:00:00Z"
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-09-29T12:00:00Z"
 *       400:
 *         description: Bad Request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Amount in Naira, crypto, and network are required"
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Insufficient wallet balance for transfer"
 */

/**
 * @swagger
 * /web3/paystack/crypto/transactions:
 *   get:
 *     summary: Get all user transactions
 *     description: Retrieves all Paystack crypto transactions for the authenticated user
 *     tags: [Paystack Crypto]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Transactions retrieved successfully
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
 *                   example: "Transaction Found"
 *                 transaction:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         example: "507f1f77bcf86cd799439011"
 *                       userID:
 *                         type: string
 *                         example: "user123"
 *                       amount:
 *                         type: number
 *                         example: 10000
 *                       crypto:
 *                         type: string
 *                         example: "usdt"
 *                       network:
 *                         type: string
 *                         example: "bsc"
 *                       status:
 *                         type: string
 *                         example: "pending"
 *                       reference:
 *                         type: string
 *                         example: "ref_abc123xyz"
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         example: "2025-09-29T12:00:00Z"
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                         example: "2025-09-29T12:00:00Z"
 *       404:
 *         description: No transactions found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Transaction for this user not found"
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Error retrieving transactions"
 */

/**
 * @swagger
 * /web3/paystack/crypto/transaction/{id}:
 *   get:
 *     summary: Get specific transaction details
 *     description: Retrieves details of a specific Paystack crypto transaction by ID for the authenticated user
 *     tags: [Paystack Crypto]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The transaction ID
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Transaction retrieved successfully
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
 *                   example: "Transaction Found"
 *                 transaction:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: "507f1f77bcf86cd799439011"
 *                     userID:
 *                       type: string
 *                       example: "user123"
 *                     amount:
 *                       type: number
 *                       example: 10000
 *                     crypto:
 *                       type: string
 *                       example: "usdt"
 *                     network:
 *                       type: string
 *                       example: "bsc"
 *                     status:
 *                       type: string
 *                       example: "completed"
 *                     reference:
 *                       type: string
 *                       example: "ref_abc123xyz"
 *                     paymentMethod:
 *                       type: string
 *                       example: "paystack"
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-09-29T12:00:00Z"
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-09-29T12:00:00Z"
 *       404:
 *         description: Transaction not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Transaction for this user not found"
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Error retrieving transaction"
 */

// Routes

router.post('/crypto/initialize', authorize, initiateCryptoPayment);
router.post('/crypto/transfer/new', authorize, initiateNewTransfer);
router.get('/crypto/transactions', authorize, transactionDetails);
router.get('/crypto/transaction/:id', authorize, transactionDetail);

export default router;
