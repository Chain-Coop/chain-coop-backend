// routes/lndRoutes.ts
import express from 'express';
import * as lndController from '../../../controllers/web3/lnd/lndController';
import CashwyreController from '../../../controllers/web3/cashWyre/cashWyre';
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

/**
 * @swagger
 * /web3/lnd/create-address:
 *   post:
 *     summary: Generate crypto address
 *     description: This is used to generate crypto addresses for customers. BTC addresses are persistent per user, while Lightning Network addresses are temporary (1 hour expiry).
 *     tags: [LND]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - assetType
 *               - network
 *             properties:
 *               assetType:
 *                 type: string
 *                 description: The type of cryptocurrency asset
 *                 example: bitcoin
 *               network:
 *                 type: string
 *                 description: The blockchain network identifier
 *                 enum: [BTC, BTC_LN]
 *                 example: "BTC"
 *               amount:
 *                 type: number
 *                 description: The amount of asset to transact (required for Lightning Network)
 *                 example: 0.0001
 *     responses:
 *       200:
 *         description: Address has been successfully created or retrieved
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
 *                   example: "BTC address has been successfully created"
 *                 data:
 *                   type: object
 *                   properties:
 *                     address:
 *                       type: string
 *                       example: "bc1qwqpm3d6j7tetfhhjjkjtvw8zky2zr5pweaseze"
 *                     status:
 *                       type: string
 *                       example: "active"
 *                     assetType:
 *                       type: string
 *                       example: "bitcoin"
 *                     network:
 *                       type: string
 *                       example: "BTC"
 *                     amount:
 *                       type: number
 *                       description: Present for Lightning Network addresses
 *                       example: 0.0001
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *                       description: Present for Lightning Network addresses
 *                       example: "2023-12-25T13:00:00.000Z"
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2023-12-25T12:00:00.000Z"
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
 *                   example: "Asset type and network are required"
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
 *                   example: "Failed to create crypto address"
 */

/**
 * @swagger
 * /web3/lnd/lightning-addresses:
 *   get:
 *     summary: Get user's Lightning Network addresses
 *     description: Retrieves the user's Lightning Network addresses, with optional filtering for active addresses only
 *     tags: [LND]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: active
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Filter to show only active (non-expired) Lightning addresses
 *         example: "true"
 *     responses:
 *       200:
 *         description: Lightning addresses retrieved successfully
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
 *                   example: "Lightning addresses retrieved successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: "64f8a1b2c3d4e5f6g7h8i9j0"
 *                       userId:
 *                         type: string
 *                         example: "64f8a1b2c3d4e5f6g7h8i9j0"
 *                       address:
 *                         type: string
 *                         example: "lnbc10u1p3xnhl2pp5jptserfk3zk4qy..."
 *                       assetType:
 *                         type: string
 *                         example: "bitcoin"
 *                       amount:
 *                         type: number
 *                         example: 0.0001
 *                       status:
 *                         type: string
 *                         example: "active"
 *                       requestId:
 *                         type: string
 *                         example: "550e8400-e29b-41d4-a716-446655440000"
 *                       code:
 *                         type: string
 *                         example: "200"
 *                       customerId:
 *                         type: string
 *                         example: "cust_123456789"
 *                       expiresAt:
 *                         type: string
 *                         format: date-time
 *                         example: "2023-12-25T13:00:00.000Z"
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         example: "2023-12-25T12:00:00.000Z"
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
 *                   example: "Failed to retrieve lightning addresses"
 */

/**
 * @swagger
 * /web3/lnd/send-lightning:
 *   post:
 *     summary: Send Lightning Network payment
 *     description: Send a Lightning Network payment to a specified lightning address
 *     tags: [LND]
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
 *               - lightningAddress
 *             properties:
 *               amount:
 *                 type: number
 *                 description: The amount to send in BTC
 *                 example: 0.0001
 *                 minimum: 0.00000001
 *               lightningAddress:
 *                 type: string
 *                 description: The Lightning Network address or invoice to send payment to
 *                 example: "lnbc10u1p3xnhl2pp5jptserfk3zk4qy..."
 *     responses:
 *       200:
 *         description: Lightning payment sent successfully
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
 *                   example: "Lightning payment sent successfully"
 *                 data:
 *                   type: object
 *                   description: Payment details returned by the service
 *                   properties:
 *                     paymentHash:
 *                       type: string
 *                       description: Unique identifier for the payment
 *                       example: "64f8a1b2c3d4e5f6g7h8i9j0k1l2m3n4"
 *       400:
 *         description: Bad Request - Missing required fields
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
 *                   example: "Amount and lightning address are required"
 *       401:
 *         description: Unauthorized
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
 *                   example: "Unauthorized access"
 *       404:
 *         description: Not Found - Failed to send payment
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
 *                   example: "Failed to send lightning payment"
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
 *                   example: "Failed to send lightning payment"
 */

/**
 * @swagger
 * /web3/lnd/wallet/lock-status:
 *   get:
 *     summary: Get Bitcoin lock status for user
 *     tags: [LND]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lock status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Lock status retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     hasActiveLock:
 *                       type: boolean
 *                       description: Whether user has an active lock
 *                       example: true
 *                     totalLocks:
 *                       type: integer
 *                       description: Total number of locks (active and expired)
 *                       example: 3
 *                     activeLocks:
 *                       type: array
 *                       description: List of currently active locks
 *                       items:
 *                         type: object
 *                         properties:
 *                           lockId:
 *                             type: string
 *                             example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *                           amount:
 *                             type: integer
 *                             description: Locked amount in satoshis
 *                             example: 100000
 *                           unlockAt:
 *                             type: string
 *                             format: date-time
 *                             description: When the lock expires
 *                           purpose:
 *                             type: string
 *                             example: "staking"
 *                           status:
 *                             type: string
 *                             example: "active"
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /web3/lnd/wallet/lock/{lockId}:
 *   get:
 *     summary: Get specific lock details by ID
 *     tags: [LND]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: lockId
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique identifier of the lock
 *         example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *     responses:
 *       200:
 *         description: Lock details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Lock details retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     lockId:
 *                       type: string
 *                       example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *                     amount:
 *                       type: integer
 *                       description: Locked amount in satoshis
 *                       example: 100000
 *                     lockedAt:
 *                       type: string
 *                       format: date-time
 *                       description: When the funds were locked
 *                       example: "2025-06-01T10:00:00.000Z"
 *                     unlockAt:
 *                       type: string
 *                       format: date-time
 *                       description: When the funds will unlock
 *                       example: "2025-07-01T10:00:00.000Z"
 *                     purpose:
 *                       type: string
 *                       description: Purpose of the lock
 *                       example: "staking"
 *                     status:
 *                       type: string
 *                       description: Current status of the lock
 *                       example: "active"
 *                     isExpired:
 *                       type: boolean
 *                       description: Whether the lock has expired
 *                       example: false
 *                     timeRemaining:
 *                       type: string
 *                       description: Human-readable time remaining
 *                       example: "20 days, 14 hours"
 *       400:
 *         description: Bad request (Lock ID is required)
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Lock not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /web3/lnd/wallet/available-balance:
 *   get:
 *     summary: Get user's available (unlocked) balance
 *     tags: [LND]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Available balance retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Available balance retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     availableBalance:
 *                       type: integer
 *                       description: Available balance in satoshis (total balance minus locked balance)
 *                       example: 50000
 *                     balanceInBTC:
 *                       type: number
 *                       description: Available balance in BTC
 *                       example: 0.0005
 *                     lastUpdated:
 *                       type: string
 *                       format: date-time
 *                       description: When the balance was last calculated
 *                       example: "2025-07-10T12:00:00.000Z"
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */

// Fix typo in controller response message:
// Change line 150 in controller from:
// message: 'Bitcoin balanceretrieved successfully',
// to:
// message: 'Bitcoin balance retrieved successfully',

/**
 * @swagger
 * /web3/lnd/wallet/bitcoin-balance:
 *   get:
 *     summary: Get comprehensive Bitcoin balance information
 *     tags: [LND]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Bitcoin balance retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Bitcoin balance retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalBalance:
 *                       type: integer
 *                       description: Total Bitcoin balance in satoshis
 *                       example: 150000
 *                     lockedBalance:
 *                       type: integer
 *                       description: Currently locked Bitcoin balance in satoshis
 *                       example: 100000
 *                     availableBalance:
 *                       type: integer
 *                       description: Available Bitcoin balance in satoshis
 *                       example: 50000
 *                     confirmedBalance:
 *                       type: integer
 *                       description: Confirmed Bitcoin balance in satoshis
 *                       example: 150000
 *                     unconfirmedBalance:
 *                       type: integer
 *                       description: Unconfirmed Bitcoin balance in satoshis
 *                       example: 0
 *                     balanceInBTC:
 *                       type: object
 *                       description: Balance amounts in BTC denomination
 *                       properties:
 *                         total:
 *                           type: number
 *                           example: 0.0015
 *                         locked:
 *                           type: number
 *                           example: 0.001
 *                         available:
 *                           type: number
 *                           example: 0.0005
 *                     lastUpdated:
 *                       type: string
 *                       format: date-time
 *                       description: When the balance was last updated
 *                       example: "2025-07-10T12:00:00.000Z"
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */

// Invoice routes
router.post('/wallet/lock', authorize, lndController.lockFunds);
router.post('/wallet/unlock', authorize, lndController.unlockFunds);
router.get('/wallet/info', authorize, lndController.getWalletInfo);
router.get('/wallet/lock-status', authorize, lndController.getLockStatus);
router.get('/wallet/lock/:lockId', authorize, lndController.getLockDetails);
router.get('/wallet/available-balance', authorize, lndController.getAvailableBalance);
router.get('/wallet/bitcoin-balance', authorize, lndController.getBitcoinBalance);
// crypto route
router.post(
  '/create-address',
  authorize,
  CashwyreController.generateCryptoAddress
);
router.get(
  '/lightning-addresses',
  authorize,
  CashwyreController.getUserLightningAddresses
);
router.post(
  '/send-lightning',
  authorize,
  CashwyreController.sendLightningPayment
);
export default router;
