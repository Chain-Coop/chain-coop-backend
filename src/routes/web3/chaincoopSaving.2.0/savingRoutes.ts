import { Router } from "express";
import {
  withdrawFromPoolByID,
  openSavingPool,
  allUserPools,
  totalNumberPoolCreated,
  updatePoolWithAmount,
  restartPoolForSaving,
  stopSavingForPool,
  allUserPoolsContributions
} from "../../../controllers/web3/chaincoopSaving.2.0/savingcontroller";
import { authorize } from "../../../middlewares/authorization";
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
 *               tokenId:
 *                 type: string
 *                 description: Token ID (1 for USDC, 2 for Lisk Token,3 for WUSDC)
 *               amount:
 *                 type: number
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
 *                   example: Provide all required values poolId_bytes,tokenId,amount
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
 * /web3/v2/saving/userPools:
 *   get:
 *     summary: Get all user pools
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
 * /web3/v2/saving/totalPools:
 *   get:
 *     summary: Get total number of pools created
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
 * /web3/v2/saving/stopPool:
 *   post:
 *     summary: Stop saving for a pool
 *     description: Stops a user's saving process for a specific pool.
 *     tags: [Web3]
 *     security:
 *       - BearerAuth: []
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
 *       - BearerAuth: []
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
 * /web3/v2/saving/userPoolContributions:
 *   get:
 *     summary: Get all user pool contributions
 *     description: Retrieves all contributions made by the authenticated user to various pools.
 *     tags: [Web3]
 *     security:
 *       - BearerAuth: []
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

router.post("/openPool", authorize, openSavingPool);
router.post("/updatePool", authorize, updatePoolWithAmount);
router.post("/withdraw", authorize, withdrawFromPoolByID);
router.post("/stopPool", authorize, stopSavingForPool);
router.post("/restartPool", authorize, restartPoolForSaving);
router.get("/userPools", authorize, allUserPools);
router.get("/totalPools", authorize, totalNumberPoolCreated);
router.get("/userPoolContributions", authorize, allUserPoolsContributions);

export default router;