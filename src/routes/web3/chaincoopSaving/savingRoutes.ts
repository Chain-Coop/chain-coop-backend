import { Router } from "express";
import {
  withdrawFromPoolByID,
  openSavingPool,
  allUserPools,
  totalNumberPoolCreated,
  updatePoolWithAmount,
} from "../../../controllers/web3/chaincoopSaving/savingcontroller";
import { authorize } from "../../../middlewares/authorization";
const router = Router();

/**
 * @swagger
 * /web3/saving/openPool:
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
 *                 description: The token ID (1 for USDC, 2 for Lisk Token)
 *               initialSaveAmount:
 *                 type: number
 *                 description: Initial amount to save
 *               goalAmount:
 *                 type: number
 *                 description: Goal amount to save
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
 *                   example: Provide all required values initialSaveAmount,goalAmount,reasonForSaving,duration
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
 * /web3/saving/updatePool:
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
 * /web3/saving/withdraw:
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
 * /web3/saving/userPools:
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
 * /web3/saving/totalPools:
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
router.post("/openPool", authorize, openSavingPool);
router.post("/updatePool", authorize, updatePoolWithAmount);
router.post("/withdraw", authorize, withdrawFromPoolByID);
router.get("/userPools", authorize, allUserPools);
router.get("/totalPools", authorize, totalNumberPoolCreated);

export default router;
