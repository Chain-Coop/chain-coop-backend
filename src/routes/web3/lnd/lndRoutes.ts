// routes/lndRoutes.ts
import express from 'express';
import * as lndController from '../../../controllers/web3/lnd/lndController';
import { authorize } from '../../../middlewares/authorization';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: LND
 *   description: BTC interaction with LND
 */

/**
 * @swagger
 * /web3/lnd/invoice/create:
 *   post:
 *     summary: Create a new Lightning Network invoice
 *     tags: [LND]
 *     security:
 *       - bearerAuth: []
 *       - macaroonAuth: []
 *     requestBody:
 *       description: Invoice data (satoshis, memo, etc.)
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               memo:
 *                 type: string
 *                 description: Optional description for the invoice
 *                 example: "Coffee payment"
 *               amount:
 *                 type: integer
 *                 description: Amount in satoshis
 *                 example: 25000
 *             required:
 *               - amount
 *     responses:
 *       201:
 *         description: Invoice created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Created invoice successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     invoiceId:
 *                       type: string
 *                       description: Monotonically increasing invoice index
 *                     payment_request:
 *                       type: string
 *                       description: BOLT11 payment request
 *                     amount:
 *                       type: integer
 *                       description: Amount in satoshis
 *                     expires_at:
 *                       type: string
 *                       format: date-time
 *                       description: ISO-8601 timestamp when the invoice expires
 *                   required:
 *                     - invoiceId
 *                     - payment_request
 *                     - amount
 *                     - expires_at
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized – missing or invalid macaroon
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /web3/lnd/invoice/{invoiceId}:
 *   get:
 *     summary: Get a single invoice by its ID
 *     tags: [LND]
 *     parameters:
 *       - in: path
 *         name: invoiceId
 *         required: true
 *         description: The unique identifier (add_index) of the invoice
 *         schema:
 *           type: string
 *           example: "1"
 *     security:
 *       - bearerAuth: []              # adjust if using macaroonAuth
 *     responses:
 *       200:
 *         description: Invoice found successfully
 *       404:
 *         description: Invoice not found
 *       401:
 *         description: Unauthorized – missing or invalid credentials
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /web3/lnd/invoices/user/{userId}:
 *   get:
 *     summary: Get all invoices for a given user
 *     tags: [LND]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         description: The user's unique identifier
 *         schema:
 *           type: string
 *           example: "60f7a4c8e4b0b12d4c8e4f7a"
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of invoices retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *       401:
 *         description: Unauthorized – missing or invalid credentials
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /web3/lnd/invoice/send:
 *   post:
 *     summary: Send payment on Lightning Network invoice
 *     tags: [LND]
 *     security:
 *       - bearerAuth: []
 *       - macaroonAuth: []               # header: Grpc-Metadata-macaroon
 *     requestBody:
 *       description: Invoice identifier to pay
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               invoiceId:
 *                 type: string
 *                 description: The internal invoiceId (add_index) of the invoice stored in your system
 *                 example: "1"
 *             required:
 *               - invoiceId
 *     responses:
 *       200:
 *         description: Payment stream started; final status will be streamed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Payment recorded successfully"
 *       400:
 *         description: Bad request (e.g. missing invoiceId or invalid invoice state)
 *       401:
 *         description: Unauthorized – missing or invalid credentials
 *       404:
 *         description: Invoice not found
 *       500:
 *         description: Server error (e.g. payment routing failure)
 */



/**
 * @swagger
 * tags:
 *   name: LND
 *   description: BTC interaction with LND
 */

/**
 * @swagger
 * /web3/lnd/invoice/create:
 *   post:
 *     summary: Create a new Lightning Network invoice
 *     tags: [LND]
 *     security:
 *       - bearerAuth: []
 *       - macaroonAuth: []
 *     requestBody:
 *       description: Invoice data (satoshis, memo, etc.)
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               memo:
 *                 type: string
 *                 description: Optional description for the invoice
 *                 example: "Coffee payment"
 *               amount:
 *                 type: integer
 *                 description: Amount in satoshis
 *                 example: 25000
 *             required:
 *               - amount
 *     responses:
 *       201:
 *         description: Invoice created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Created invoice successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     invoiceId:
 *                       type: string
 *                       description: Monotonically increasing invoice index
 *                     payment_request:
 *                       type: string
 *                       description: BOLT11 payment request
 *                     amount:
 *                       type: integer
 *                       description: Amount in satoshis
 *                     expires_at:
 *                       type: string
 *                       format: date-time
 *                       description: ISO-8601 timestamp when the invoice expires
 *                   required:
 *                     - invoiceId
 *                     - payment_request
 *                     - amount
 *                     - expires_at
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized – missing or invalid macaroon
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /web3/lnd/invoice/{invoiceId}:
 *   get:
 *     summary: Get a single invoice by its ID
 *     tags: [LND]
 *     parameters:
 *       - in: path
 *         name: invoiceId
 *         required: true
 *         description: The unique identifier (add_index) of the invoice
 *         schema:
 *           type: string
 *           example: "1"
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Invoice found successfully
 *       404:
 *         description: Invoice not found
 *       401:
 *         description: Unauthorized – missing or invalid credentials
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /web3/lnd/invoices/user/{userId}:
 *   get:
 *     summary: Get all invoices for a given user
 *     tags: [LND]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         description: The user's unique identifier
 *         schema:
 *           type: string
 *           example: "60f7a4c8e4b0b12d4c8e4f7a"
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of invoices retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *       401:
 *         description: Unauthorized – missing or invalid credentials
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /web3/lnd/invoice/send:
 *   post:
 *     summary: Send payment on Lightning Network invoice
 *     tags: [LND]
 *     security:
 *       - bearerAuth: []
 *       - macaroonAuth: []
 *     requestBody:
 *       description: Invoice identifier to pay
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               invoiceId:
 *                 type: string
 *                 description: The internal invoiceId (add_index) of the invoice stored in your system
 *                 example: "1"
 *             required:
 *               - invoiceId
 *     responses:
 *       200:
 *         description: Payment stream started; final status will be streamed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Payment recorded successfully"
 *       400:
 *         description: Bad request (e.g. missing invoiceId or invalid invoice state)
 *       401:
 *         description: Unauthorized – missing or invalid credentials
 *       404:
 *         description: Invoice not found
 *       500:
 *         description: Server error (e.g. payment routing failure)
 */

/**
 * @swagger
 * /web3/lnd/wallet/lock:
 *   post:
 *     summary: Lock funds in wallet for staking or escrow
 *     tags: [LND]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: Lock parameters
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: integer
 *                 description: Amount to lock in satoshis
 *                 example: 100000
 *               unlockAt:
 *                 type: string
 *                 format: date-time
 *                 description: ISO-8601 timestamp when funds should unlock
 *                 example: "2025-07-01T00:00:00.000Z"
 *               purpose:
 *                 type: string
 *                 description: Purpose of the lock
 *                 example: "staking"
 *                 default: "staking"
 *             required:
 *               - amount
 *               - unlockAt
 *     responses:
 *       200:
 *         description: Funds locked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Funds locked successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     lockId:
 *                       type: string
 *                       description: Unique identifier for the lock
 *                       example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *                     amount:
 *                       type: integer
 *                       description: Locked amount in satoshis
 *                       example: 100000
 *                     unlockAt:
 *                       type: string
 *                       format: date-time
 *                       description: When the funds will unlock
 *                     purpose:
 *                       type: string
 *                       example: "staking"
 *                     availableBalance:
 *                       type: integer
 *                       description: Remaining available balance after lock
 *                       example: 50000
 *       400:
 *         description: Bad request (invalid amount, past unlock date, insufficient balance, or existing active lock)
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /web3/lnd/wallet/unlock:
 *   post:
 *     summary: Manually unlock currently locked funds
 *     tags: [LND]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Funds unlocked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Funds unlocked successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     unlockedAmount:
 *                       type: integer
 *                       description: Amount that was unlocked in satoshis
 *                       example: 100000
 *                     availableBalance:
 *                       type: integer
 *                       description: New available balance after unlock
 *                       example: 150000
 *       400:
 *         description: Bad request (no active lock found)
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /web3/lnd/wallet/info:
 *   get:
 *     summary: Get comprehensive wallet information including locks
 *     tags: [LND]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Wallet information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Wallet details retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalBalance:
 *                       type: integer
 *                       description: Total wallet balance in satoshis
 *                       example: 150000
 *                     lockedBalance:
 *                       type: integer
 *                       description: Currently locked balance in satoshis
 *                       example: 100000
 *                     availableBalance:
 *                       type: integer
 *                       description: Available balance for spending in satoshis
 *                       example: 50000
 *                     activeLock:
 *                       type: object
 *                       nullable: true
 *                       description: Current active lock details (null if no active lock)
 *                       properties:
 *                         amount:
 *                           type: integer
 *                           description: Locked amount in satoshis
 *                           example: 100000
 *                         lockedAt:
 *                           type: string
 *                           format: date-time
 *                           description: When the funds were locked
 *                         unlockAt:
 *                           type: string
 *                           format: date-time
 *                           description: When the funds will unlock
 *                         purpose:
 *                           type: string
 *                           description: Purpose of the lock
 *                           example: "staking"
 *                         lockId:
 *                           type: string
 *                           description: Unique identifier for the lock
 *                     hasActiveLock:
 *                       type: boolean
 *                       description: Whether there is currently an active lock
 *                       example: true
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */

// Invoice routes
router.post('/invoice/create', authorize, lndController.createInvoice);
router.get('/invoice/:invoiceId', authorize, lndController.getInvoice);
router.get('/invoices/user/:userId', authorize, lndController.getUserInvoice);
router.post('/invoice/send', authorize, lndController.sendPayment);
router.post('/wallet/lock', authorize, lndController.lockFunds);
router.post('/wallet/unlock', authorize, lndController.unlockFunds);
router.get('/wallet/info', authorize, lndController.getWalletInfo);
// router.get('/invoice/:id',authorize, lndController.getInvoice);
// router.post('/invoice/webhook',authorize, lndController.setupInvoiceWebhook);
// router.post('/invoice/decode', lndController.decodeInvoice);

// // Payment routes
// router.post('/payment/send',authorize, lndController.payInvoice);
// router.get('/channels', authorize,lndController.getChannels);

// router.get('/transactions',authorize, lndController.getTransactions);
// router.get('/userInvoice',authorize, lndController.getUserInvoices);
// router.get('/userPayment',authorize, lndController.getUserPayments);
// router.get('/userWallet',authorize, lndController.getWalletDetails);

// // Wallet routes
// router.get('/wallet/info', authorize,lndController.getWalletInfo);
// router.post('/wallet/address',authorize, lndController.createBitcoinAddress);
export default router;


