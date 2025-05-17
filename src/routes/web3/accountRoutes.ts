import { Router } from 'express';
import {
  activateWeb3Wallet,
  activateBitcoinWallet,
  userDetails,
} from '../../controllers/web3/accountController';
import { authorize } from '../../middlewares/authorization';
const router = Router();

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

router.post('/activate', authorize, activateWeb3Wallet);
router.post('/activateBitcoin', authorize, activateBitcoinWallet);
router.get('/details', authorize, userDetails);
router;

export default router;
