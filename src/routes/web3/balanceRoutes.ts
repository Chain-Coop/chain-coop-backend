import { Router } from "express";
import { userTokenBalance } from "../../controllers/web3/balanceController";
import { authorize } from "../../middlewares/authorization";
const router = Router();

/**
 * @swagger
 * tags:
 *   name: Web3
 *   description: Web3 routes
 */

/**
 * @swagger
 * /web3/balance/token/{tokenId}:
 *   get:
 *     summary: Get the token balance for the user
 *     tags:
 *       - [Web3]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tokenId
 *         required: true
 *         schema:
 *           type: integer
 *           description: ID of the token (1 for USDC, 2 for Lisk Token)
 *         example: 1
 *     responses:
 *       200:
 *         description: Balance fetched successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Balance fetched successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     bal:
 *                       type: number
 *                       description: The balance of the token.
 *                       example: 100.5
 *                     symbol:
 *                       type: string
 *                       description: The token symbol.
 *                       example: USDC
 *       400:
 *         description: Bad Request (e.g., invalid tokenId or wallet not activated).
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Wallet not activated
 *       401:
 *         description: Unauthorized (missing or invalid bearer token).
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

router.get("/token/:tokenId", authorize, userTokenBalance);

export default router;
