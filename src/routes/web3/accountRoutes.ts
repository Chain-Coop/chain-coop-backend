import { Router } from 'express';
import {
  activateWeb3Wallet,
  activateBitcoinWallet,
  userDetails,
  withdraw,
  withdrawBitcoin,
  lockBitcoin,
  unlockBitcoin,
  getBitcoinBalanceWithLocks,
  getLockStatus,
  transferGasfees,
} from '../../controllers/web3/accountController';
import { authorize, verifyPin } from '../../middlewares/authorization';
const router = Router();

/**
 * @swagger
 * tags:
 *   - name: [Web3]
 *     description: Web3 and Bitcoin wallet operations
 */

/**
 * @swagger
 * /web3/account/activate:
 *   post:
 *     summary: Activate a new Web3 wallet for the user
 *     tags:
 *       - [Web3]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: A bearer token is required in the Authorization header to identify the user.
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Account activated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Account activated successfully
 *       400:
 *         description: Wallet Already Activated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Wallet Already Activated
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Unauthorized
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Internal Server Error
 */

/**
 * @swagger
 * /web3/account/activateBitcoin:
 *   post:
 *     summary: Activate a new Bitcoin wallet for the user
 *     tags:
 *       - [Web3]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: A bearer token is required in the Authorization header to identify the user.
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Account activated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Account activated successfully
 *       400:
 *         description: Wallet Already Activated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Wallet Already Activated
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Unauthorized
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Internal Server Error
 */

/**
 * @swagger
 * /web3/account/transferGasfees:
 *  get:
 *    summary: Transfer gas fees to the user's Web3 wallet
 *    tags:
 *      - [Web3]
 *    security:
 *      - bearerAuth: []
 *    responses:
 *      200:
 *        description: Gas fees transferred successfully.
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                message:
 *                  type: string
 *                  example: Gas fees transferred successfully
 *      400:
 *        description: No Wallet found
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                message:
 *                  type: string
 *                  example: No Wallet found
 */

/**
 * @swagger
 * /web3/account/details:
 *   get:
 *     summary: Get details of the user's Web3 wallet
 *     tags:
 *       - [Web3]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Wallet details retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     userId:
 *                       type: string
 *                       example: "1234567890"
 *                     walletAddress:
 *                       type: string
 *                       example: "0x1234567890abcdef1234567890abcdef12345678"
 *                     balance:
 *                       type: number
 *                       example: 100.0
 *                     btcAddress:
 *                       type: string
 *                       example: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"
 *       400:
 *         description: No Wallet found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: No Wallet found
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Unauthorized
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Internal Server Error
 */

/**
 * @swagger
 * /web3/account/withdraw:
 *   post:
 *     summary: Withdraw tokens from user's Web3 wallet
 *     tags:
 *       - [Web3]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: Transfer tokens to specified address
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - address
 *               - tokenId
 *               - network
 *               - pin
 *             properties:
 *               amount:
 *                 type: string
 *                 description: Amount of tokens to transfer
 *                 example: 100.5
 *               address:
 *                 type: string
 *                 description: Destination wallet address
 *                 example: "0x742d35Cc6634C0532925a3b8D40a9B742d35c"
 *               tokenId:
 *                 type: string
 *                 description: Token identifier
 *                 example: "1"
 *               network:
 *                 type: string
 *                 description: Blockchain network
 *                 example: "LISK"
 *               pin:
 *                 type: string
 *                 description: Input your wallet pin
 *                 example: "0000"
 *     responses:
 *       200:
 *         description: Token transferred successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Token has been transferred successfully
 *                 data:
 *                   type: object
 *                   description: Transaction details
 *       400:
 *         description: Bad Request - Missing required fields or invalid data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: input amount, address, tokenId, network
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Unauthorized
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Internal Server Error
 */

/**
 * @swagger
 * /web3/account/withdrawBitcoin:
 *   post:
 *     summary: Withdraw Bitcoin from user's Bitcoin wallet
 *     tags:
 *       - [Web3]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: Transfer Bitcoin to specified address
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - address
 *               - pin
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Amount of Bitcoin to transfer (in BTC)
 *                 example: 0.001
 *               address:
 *                 type: string
 *                 description: Destination Bitcoin address
 *                 example: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"
 *               pin:
 *                 type: string
 *                 description: Input your pin
 *                 example: "0000"
 *     responses:
 *       200:
 *         description: Bitcoin transferred successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Bitcoin successfully sent
 *                 data:
 *                   type: object
 *                   description: Transaction details
 *       400:
 *         description: Bad Request - Missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: amount and address is not defined
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Unauthorized
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Internal Server Error
 */

/**
 * @swagger
 * /web3/account/lock:
 *   post:
 *     summary: Lock Bitcoin amount for a specified duration
 *     tags:
 *       - [Web3]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: Lock a specific amount of Bitcoin for a given time period
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - duration
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Amount of Bitcoin to lock (in BTC)
 *                 example: 0.005
 *               duration:
 *                 type: integer
 *                 description: Lock duration in seconds
 *                 example: 3600
 *               reason:
 *                 type: string
 *                 description: Optional reason for locking the Bitcoin
 *                 example: "Savings goal for next month"
 *     responses:
 *       200:
 *         description: Bitcoin successfully locked
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Bitcoin successfully locked
 *                 data:
 *                   type: object
 *                   properties:
 *                     amount:
 *                       type: number
 *                       example: 0.005
 *                     lockedAt:
 *                       type: string
 *                       example: "2024-12-01T10:00:00.000Z"
 *                     unlocksAt:
 *                       type: string
 *                       example: "2024-12-01T11:00:00.000Z"
 *                     lockDuration:
 *                       type: integer
 *                       example: 3600
 *                     lockReason:
 *                       type: string
 *                       example: "Savings goal for next month"
 *                     isLocked:
 *                       type: boolean
 *                       example: true
 *       400:
 *         description: Bad Request - Missing required fields or invalid data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Amount and duration are required
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Unauthorized
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Wallet already has an active lock. Please wait for it to expire or unlock it first.
 */

/**
 * @swagger
 * /web3/account/unlock:
 *   post:
 *     summary: Unlock Bitcoin amount
 *     tags:
 *       - [Web3]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: A bearer token is required in the Authorization header to identify the user.
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Bitcoin successfully unlocked
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Bitcoin successfully unlocked
 *                 data:
 *                   type: object
 *                   properties:
 *                     unlockedAt:
 *                       type: string
 *                       example: "2024-12-01T11:00:00.000Z"
 *                     isLocked:
 *                       type: boolean
 *                       example: false
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Unauthorized
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Lock period has not expired yet. Time remaining: 2 hours"
 */

/**
 * @swagger
 * /web3/account/lock-status:
 *   get:
 *     summary: Get Bitcoin lock status
 *     tags:
 *       - [Web3]
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
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     isLocked:
 *                       type: boolean
 *                       example: true
 *                     lockedAmount:
 *                       type: number
 *                       example: 0.005
 *                     lockedAt:
 *                       type: string
 *                       example: "2024-12-01T10:00:00.000Z"
 *                     unlocksAt:
 *                       type: string
 *                       example: "2024-12-01T11:00:00.000Z"
 *                     lockDuration:
 *                       type: integer
 *                       example: 3600
 *                     lockReason:
 *                       type: string
 *                       example: "Savings goal for next month"
 *                     timeRemainingMs:
 *                       type: integer
 *                       example: 1800000
 *                     timeRemainingHours:
 *                       type: integer
 *                       example: 1
 *                     canUnlock:
 *                       type: boolean
 *                       example: false
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Unauthorized
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Bitcoin wallet not found for this user
 */

/**
 * @swagger
 * /web3/account/balance:
 *   get:
 *     summary: Get Bitcoin balance with lock details
 *     tags:
 *       - [Web3]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Balance details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalBalance:
 *                       type: number
 *                       example: 0.01
 *                     lockedAmount:
 *                       type: number
 *                       example: 0.005
 *                     availableBalance:
 *                       type: number
 *                       example: 0.005
 *                     isLocked:
 *                       type: boolean
 *                       example: true
 *                     lockDetails:
 *                       type: object
 *                       properties:
 *                         lockedAt:
 *                           type: string
 *                           example: "2024-12-01T10:00:00.000Z"
 *                         unlocksAt:
 *                           type: string
 *                           example: "2024-12-01T11:00:00.000Z"
 *                         lockDuration:
 *                           type: integer
 *                           example: 3600
 *                         lockReason:
 *                           type: string
 *                           example: "Savings goal for next month"
 *                         timeRemainingMs:
 *                           type: integer
 *                           example: 1800000
 *                         canUnlock:
 *                           type: boolean
 *                           example: false
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Unauthorized
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Bitcoin wallet not found for this user
 */

router.post('/activate', authorize, activateWeb3Wallet);
router.post('/activateBitcoin', authorize, activateBitcoinWallet);
router.get('/details', authorize, userDetails);
router.post('/withdraw', authorize, verifyPin, withdraw);
router.post('/withdrawBitcoin', authorize, verifyPin, withdrawBitcoin);
// Lock-related routes
router.post('/lock', authorize, lockBitcoin);
router.post('/unlock', authorize, unlockBitcoin);
router.get('/lock-status', authorize, getLockStatus);
router.get('/balance', authorize, getBitcoinBalanceWithLocks);
router.get('/transferGasfees', authorize, transferGasfees);

export default router;
