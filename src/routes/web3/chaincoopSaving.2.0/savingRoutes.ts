import { Router } from 'express';
import {
  withdrawFromPoolByID,
  openSavingPool,
  allUserPools,
  totalNumberPoolCreated,
  updatePoolWithAmount,
  restartPoolForSaving,
  stopSavingForPool,
  allUserPoolsContributions,
  getManualSaving,
  getManualSavingByUser,
  getTotalAmountSavedByUser,
  getUserpoolbyReason,
  enableAaveForPoolController,
  getPoolAaveBalanceController,
  getPoolYieldController,
  checkAaveConfiguration,
} from '../../../controllers/web3/chaincoopSaving.2.0/savingcontroller';
import {
  authorize,
  verifyPin,
  kycVerified,
} from '../../../middlewares/authorization';
const router = Router();

/**
 * @swagger
 * /web3/v2/saving/openPool:
 *   post:
 *     summary: Open a new saving pool
 *     tags: [Web3]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tokenId:
 *                 type: string
 *                 description: The token ID (1 for USDC, 2 for Lisk Token,3 for WUSDC)
 *               initialSaveAmount:
 *                 type: string
 *                 description: Initial amount to save
 *               lockedType:
 *                 type: number
 *                 description: Type of lock (0-Flexible, 1-Lock, or 2-StrictLock)
 *               reasonForSaving:
 *                 type: string
 *                 description: Reason for saving
 *               duration:
 *                 type: number
 *                 description: Duration in seconds
 *               network:
 *                type: string
 *                description: Network for the saving pool (e.g.LISK, BSC, ETHERLINK, GNOSIS)
 *               pin:
 *                  type: string
 *                  description: User's pin for authorization
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Success
 *                 data:
 *                   type: string
 *                   example: transaction_hash
 *       400:
 *         description: Bad Request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Provide all required values initialSaveAmount,lockedType,reasonForSaving,duration
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: internal server error
 */

/**
 * @swagger
 * /web3/v2/saving/updatePool:
 *   post:
 *     summary: Update a saving pool with amount
 *     tags: [Web3]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               poolId_bytes:
 *                 type: string
 *                 description: Pool ID in bytes
 *               tokenAddressToSaveWith:
 *                 type: string
 *                 description: Token address to save with
 *               amount:
 *                 type: string
 *                 description: Amount to update the pool with
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Success
 *                 data:
 *                   type: string
 *                   example: transaction_hash
 *       400:
 *         description: Bad Request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Provide all required values poolId_bytes,tokenAddressToSaveWith,amount
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: internal server error
 */

/**
 * @swagger
 * /web3/v2/saving/withdraw:
 *   post:
 *     summary: Withdraw from a saving pool by ID
 *     tags: [Web3]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               poolId_bytes:
 *                 type: string
 *                 description: Pool ID in bytes
 *               pin:
 *                 type: string
 *                 description: User's pin for authorization
 *
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Success
 *                 data:
 *                   type: string
 *                   example: transaction_hash
 *       400:
 *         description: Bad Request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Provide all required values poolId_bytes
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: internal server error
 */

/**
 * @swagger
 * /web3/v2/saving/userPools/{network}:
 *   get:
 *     summary: Get all user pools on the specified network
 *     tags: [Web3]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: network
 *         required: true
 *         schema:
 *           type: string
 *         description: Network for the saving pool (e.g. LISK, BSC, ETHERLINK, GNOSIS)
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Success
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       400:
 *         description: Bad Request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Please activate wallet
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: internal server error
 */

/**
 * @swagger
 * /web3/v2/saving/totalPools/{network}:
 *   get:
 *     summary: Get total number of pools created on the specified network
 *     tags: [Web3]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: network
 *         required: true
 *         schema:
 *           type: string
 *         description: Network for the saving pool (e.g. LISK, BSC, ETHERLINK, GNOSIS)
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Success
 *                 data:
 *                   type: number
 *                   example: 10
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: internal server error
 */

/**
 * @swagger
 * /web3/v2/saving/userPoolContributions/{network}:
 *   get:
 *     summary: Get all user pool contributions on the specified network
 *     description: Retrieves all contributions made by the authenticated user to various pools on the specified network.
 *     tags: [Web3]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: network
 *         required: true
 *         schema:
 *           type: string
 *         description: Network for the saving pool (e.g. LISK, BSC, ETHERLINK, GNOSIS)
 *     responses:
 *       200:
 *         description: Successfully retrieved user contributions.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Success"
 *                 data:
 *                   type: array
 *                   description: List of user contributions.
 *                   items:
 *                     type: object
 *       400:
 *         description: Bad request if the user's wallet is not activated.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Please activate wallet"
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "internal server error {error message}"
 */

/**
 * @swagger
 * /web3/v2/saving/stopPool:
 *   post:
 *     summary: Stop saving for a pool
 *     description: Stops a user's saving process for a specific pool.
 *     tags: [Web3]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - poolId_bytes
 *             properties:
 *               poolId_bytes:
 *                 type: string
 *                 description: The unique identifier of the pool in bytes.
 *     responses:
 *       200:
 *         description: Successfully stopped saving for the pool.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Success"
 *                 data:
 *                   type: string
 *                   description: Transaction hash of the operation.
 *       400:
 *         description: Bad request due to missing or invalid parameters.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Provide all required values poolId_bytes"
 *       401:
 *         description: Unauthorized, token missing or invalid.
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "internal server error {error message}"
 */

/**
 * @swagger
 * /web3/v2/saving/restartPool:
 *   post:
 *     summary: Restart saving for a pool
 *     description: Restarts a user's saving process for a specific pool.
 *     tags: [Web3]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - poolId_bytes
 *             properties:
 *               poolId_bytes:
 *                 type: string
 *                 description: The unique identifier of the pool in bytes.
 *     responses:
 *       200:
 *         description: Successfully restarted saving for the pool.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Success"
 *                 data:
 *                   type: string
 *                   description: Transaction hash of the operation.
 *       400:
 *         description: Bad request due to missing or invalid parameters.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Provide all required values poolId_bytes"
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "internal server error {error message}"
 */

/**
 * @swagger
 * /web3/v2/saving/getManualSaving:
 *   post:
 *     summary: Get a specific manual saving pool by poolId
 *     tags: [Web3]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               poolId:
 *                 type: string
 *                 description: The ID of the saving pool to retrieve
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Success
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: 6447b7e02c4815d3a57d79ba
 *                     userId:
 *                       type: string
 *                       example: 6447b7e02c4815d3a57d79b5
 *                     poolId:
 *                       type: string
 *                       example: pool_123456789
 *                     tokenAddress:
 *                       type: string
 *                       example: 0x1234567890abcdef1234567890abcdef12345678
 *                     tokenSymbol:
 *                       type: string
 *                       example: USDC
 *                     initialAmount:
 *                       type: string
 *                       example: "100"
 *                     reason:
 *                       type: string
 *                       example: "Emergency Fund"
 *                     lockType:
 *                       type: number
 *                       example: 1
 *                     duration:
 *                       type: number
 *                       example: 2592000
 *                     isActive:
 *                       type: boolean
 *                       example: true
 *                     transactions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           txHash:
 *                             type: string
 *                             example: 0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890
 *                           amount:
 *                             type: string
 *                             example: "50"
 *                           timestamp:
 *                             type: string
 *                             format: date-time
 *                           status:
 *                             type: string
 *                             example: CONFIRMED
 *                     totalAmount:
 *                       type: string
 *                       example: "150"
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Bad Request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Provide all required values poolId
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: internal server error
 */

/**
 * @swagger
 * /web3/v2/saving/getManualSavingByUser:
 *   get:
 *     summary: Get all manual savings for the logged-in user
 *     tags: [Web3]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Success
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         example: 6447b7e02c4815d3a57d79ba
 *                       userId:
 *                         type: string
 *                         example: 6447b7e02c4815d3a57d79b5
 *                       poolId:
 *                         type: string
 *                         example: pool_123456789
 *                       tokenAddress:
 *                         type: string
 *                         example: 0x1234567890abcdef1234567890abcdef12345678
 *                       tokenSymbol:
 *                         type: string
 *                         example: USDC
 *                       initialAmount:
 *                         type: string
 *                         example: "100"
 *                       reason:
 *                         type: string
 *                         example: "Emergency Fund"
 *                       lockType:
 *                         type: number
 *                         example: 1
 *                       duration:
 *                         type: number
 *                         example: 2592000
 *                       isActive:
 *                         type: boolean
 *                         example: true
 *                       transactions:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             txHash:
 *                               type: string
 *                               example: 0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890
 *                             amount:
 *                               type: string
 *                               example: "50"
 *                             timestamp:
 *                               type: string
 *                               format: date-time
 *                             status:
 *                               type: string
 *                               example: CONFIRMED
 *                       totalAmount:
 *                         type: string
 *                         example: "150"
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *       400:
 *         description: Bad Request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: No manual saving found
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: internal server error
 */

/**
 * @swagger
 * /web3/v2/saving/getTotalAmountSaved:
 *   get:
 *     summary: Get total amount saved by user across all manual savings
 *     description: Calculates and returns the sum of all amounts saved in the user's manual saving pools
 *     tags: [Web3]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Success
 *                 data:
 *                   type: number
 *                   example: 1250.50
 *       400:
 *         description: Bad Request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: No manual saving found
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: internal server error
 */

/**
 * @swagger
 * /web3/v2/saving/getPoolByReason:
 *   post:
 *     summary: Get saving pools by reason
 *     description: Retrieves all manual savings that match the provided reason (case insensitive)
 *     tags: [Web3]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 description: The reason for saving to search for
 *                 example: House
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Success
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         example: 6447b7e02c4815d3a57d79ba
 *                       userId:
 *                         type: string
 *                         example: 6447b7e02c4815d3a57d79b5
 *                       poolId:
 *                         type: string
 *                         example: pool_123456789
 *                       tokenAddress:
 *                         type: string
 *                         example: 0x1234567890abcdef1234567890abcdef12345678
 *                       tokenSymbol:
 *                         type: string
 *                         example: USDC
 *                       initialAmount:
 *                         type: string
 *                         example: "100"
 *                       reason:
 *                         type: string
 *                         example: "House Fund"
 *                       lockType:
 *                         type: number
 *                         example: 1
 *                       duration:
 *                         type: number
 *                         example: 2592000
 *                       isActive:
 *                         type: boolean
 *                         example: true
 *                       totalAmount:
 *                         type: string
 *                         example: "150"
 *                       transactions:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             txHash:
 *                               type: string
 *                               example: 0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890
 *                             amount:
 *                               type: string
 *                               example: "50"
 *                             timestamp:
 *                               type: string
 *                               format: date-time
 *                             status:
 *                               type: string
 *                               example: CONFIRMED
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *       400:
 *         description: Bad Request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Provide all required values reason
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: internal server error
 */

/**
 * @swagger
 * /web3/v2/saving/enableAave:
 *   post:
 *     summary: Enable Aave yield farming for a saving pool
 *     description: Enables Aave integration for a specific pool to earn yield on deposited funds
 *     tags: [Web3]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - poolId_bytes
 *             properties:
 *               poolId_bytes:
 *                 type: string
 *                 description: The unique identifier of the pool in bytes
 *                 example: "0x1234567890abcdef"
 *     responses:
 *       200:
 *         description: Aave enabled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Aave enabled successfully"
 *                 data:
 *                   type: string
 *                   description: Transaction hash of the operation
 *                   example: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"
 *       400:
 *         description: Bad Request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   examples:
 *                     missing_params:
 *                       value: "Provide all required values: poolId_bytes"
 *                     wallet_not_found:
 *                       value: "Please activate wallet"
 *                     pool_not_found:
 *                       value: "Failed to find a pool 0x1234567890abcdef"
 *                     aave_not_configured:
 *                       value: "Aave is not configured for this token"
 *                     enable_failed:
 *                       value: "Failed to enable Aave for pool 0x1234567890abcdef"
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Internal server error: {error message}"
 */

/**
 * @swagger
 * /web3/v2/saving/aaveBalance/{poolId}/{network}:
 *   get:
 *     summary: Get Aave balance for a specific pool
 *     description: Retrieves the current Aave balance for a pool that has Aave enabled
 *     tags: [Web3]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: poolId
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique identifier of the pool
 *         example: "0x1234567890abcdef"
 *       - in: path
 *         name: network
 *         required: true
 *         schema:
 *           type: string
 *         description: Network for the pool (e.g. LISK, BSC, ETHERLINK, GNOSIS)
 *         example: "LISK"
 *     responses:
 *       200:
 *         description: Successfully retrieved Aave balance
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Success"
 *                 data:
 *                   type: object
 *                   properties:
 *                     poolId:
 *                       type: string
 *                       example: "0x1234567890abcdef"
 *                     aaveBalance:
 *                       type: string
 *                       example: "150.25"
 *                     network:
 *                       type: string
 *                       example: "LISK"
 *       400:
 *         description: Bad Request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Provide all required parameters: poolId, network"
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Internal server error: {error message}"
 */

/**
 * @swagger
 * /web3/v2/saving/poolYield/{poolId}/{network}:
 *   get:
 *     summary: Get yield earned from Aave for a specific pool
 *     description: Retrieves the total yield earned from Aave for a pool that has yield farming enabled
 *     tags: [Web3]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: poolId
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique identifier of the pool
 *         example: "0x1234567890abcdef"
 *       - in: path
 *         name: network
 *         required: true
 *         schema:
 *           type: string
 *         description: Network for the pool (e.g. LISK, BSC, ETHERLINK, GNOSIS)
 *         example: "LISK"
 *     responses:
 *       200:
 *         description: Successfully retrieved pool yield
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Success"
 *                 data:
 *                   type: object
 *                   properties:
 *                     poolId:
 *                       type: string
 *                       example: "0x1234567890abcdef"
 *                     yieldEarned:
 *                       type: string
 *                       example: "12.45"
 *                     network:
 *                       type: string
 *                       example: "LISK"
 *       400:
 *         description: Bad Request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Provide all required parameters: poolId, network"
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Internal server error: {error message}"
 */

/**
 * @swagger
 * /web3/v2/saving/checkAave/{tokenId}/{network}:
 *   get:
 *     summary: Check if Aave is configured for a specific token
 *     description: Verifies whether Aave integration is available for a given token on a specific network
 *     tags: [Web3]
 *     parameters:
 *       - in: path
 *         name: tokenId
 *         required: true
 *         schema:
 *           type: string
 *         description: The token ID (1 for USDC, 2 for Lisk Token, 3 for WUSDC)
 *         example: "1"
 *       - in: path
 *         name: network
 *         required: true
 *         schema:
 *           type: string
 *         description: Network to check (e.g. LISK, BSC, ETHERLINK, GNOSIS)
 *         example: "LISK"
 *     responses:
 *       200:
 *         description: Successfully checked Aave configuration
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Success"
 *                 data:
 *                   type: object
 *                   properties:
 *                     tokenId:
 *                       type: string
 *                       example: "1"
 *                     tokenAddress:
 *                       type: string
 *                       example: "0x1234567890abcdef1234567890abcdef12345678"
 *                     isAaveConfigured:
 *                       type: boolean
 *                       example: true
 *                     network:
 *                       type: string
 *                       example: "LISK"
 *       400:
 *         description: Bad Request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   examples:
 *                     missing_params:
 *                       value: "Provide all required parameters: tokenId, network"
 *                     invalid_token:
 *                       value: "Invalid tokenId"
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Internal server error: {error message}"
*/

router.post('/openPool', authorize, verifyPin, kycVerified, openSavingPool);
router.post('/updatePool', authorize, kycVerified, updatePoolWithAmount);
router.post(
  '/withdraw',
  authorize,
  verifyPin,
  kycVerified,
  withdrawFromPoolByID
);
router.post('/enableAave', authorize, kycVerified, enableAaveForPoolController);
router.get(
  '/aaveBalance/:poolId/:network',
  authorize,
  kycVerified,
  getPoolAaveBalanceController
);
router.get(
  '/poolYield/:poolId/:network',
  authorize,
  kycVerified,
  getPoolYieldController
);
router.get(
  '/checkAave/:tokenId/:network',
  authorize,
  kycVerified,
  checkAaveConfiguration
);
router.post('/stopPool', authorize, kycVerified, stopSavingForPool);
router.post('/restartPool', authorize, kycVerified, restartPoolForSaving);
router.post('/getManualSaving', authorize, getManualSaving);
router.get('/getManualSavingByUser', authorize, getManualSavingByUser);
router.get('/getTotalAmountSaved', authorize, getTotalAmountSavedByUser);
router.post('/getPoolByReason', authorize, getUserpoolbyReason);
router.get('/userPools/:network', authorize, allUserPools);
router.get('/totalPools/:network', authorize, totalNumberPoolCreated);
router.get(
  '/userPoolContributions/:network',
  authorize,
  allUserPoolsContributions
);

export default router;