import { Router } from 'express';
import {
  userTokenBalance,
  totalUserWalletBalance,
  usertokensAmount,
  getBitcoinBalanceController,
} from '../../controllers/web3/balanceController';
import { authorize } from '../../middlewares/authorization';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Web3
 *   description: Web3 routes
 */

/**
 * @swagger
 * /web3/balance/token/{tokenId}/{network}:
 *   get:
 *     summary: Get the token balance for the user
 *     tags:
 *       - Web3
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tokenId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the token (1 for USDT, 2 for USDC)
 *         example: 1
 *       - in: path
 *         name: network
 *         required: true
 *         schema:
 *           type: string
 *         description: Blockchain network (e.g., 'LISK', 'BSC', 'ETHERLINK', 'GNOSIS')
 *         example: BSC
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

/**
 * @swagger
 * /web3/balance/total/{network}:
 *   get:
 *     summary: Get the total balance of all tokens for the user
 *     tags:
 *       - Web3
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: network
 *         required: true
 *         schema:
 *           type: string
 *         description: Blockchain network (e.g., 'LISK', 'BSC', 'ETHERLINK', 'GNOSIS')
 *         example: BSC
 *     responses:
 *       200:
 *         description: Total balance fetched successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Total balance fetched successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalBalance:
 *                       type: number
 *                       description: The total balance of all tokens.
 *                       example: 1000.5
 *       400:
 *         description: Bad Request (e.g., wallet not activated).
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: No Wallet found
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

/**
 * @swagger
 * /web3/balance/tokens/{network}:
 *   get:
 *     summary: Get the balances of all tokens in the user's wallet
 *     tags:
 *       - Web3
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: network
 *         required: true
 *         schema:
 *           type: string
 *         description: Blockchain network (e.g., 'LISK', 'BSC', 'ETHERLINK', 'GNOSIS')
 *         example: BSC
 *     responses:
 *       200:
 *         description: All token balances fetched successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: All token balances fetched successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       tokenId:
 *                         type: integer
 *                         description: ID of the token.
 *                         example: 1
 *                       symbol:
 *                         type: string
 *                         description: Token symbol.
 *                         example: USDC
 *                       balance:
 *                         type: number
 *                         description: Balance of the token.
 *                         example: 100.5
 *       400:
 *         description: Bad Request (e.g., wallet not activated).
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: No Wallet found
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

/**
 * @swagger
 * /web3/balance/bitcoin/balance:
 *   get:
 *     summary: Get the user's Bitcoin wallet balance
 *     tags:
 *       - Web3
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Bitcoin balance fetched successfully.
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
 *                   description: The balance of the user's Bitcoin wallet in BTC.
 *                   example: 0.001245
 *       400:
 *         description: No wallet found for the user.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: No Wallet found
 *       401:
 *         description: Unauthorized access due to missing or invalid token.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Unauthorized
 *       500:
 *         description: Internal Server Error while fetching Bitcoin balance.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Internal Server Error
 */

router.get('/token/:tokenId/:network', authorize, userTokenBalance);
router.get('/total/:network', authorize, totalUserWalletBalance);
router.get('/tokens/:network', authorize, usertokensAmount);
router.get('/bitcoin/balance', authorize, getBitcoinBalanceController);

export default router;
