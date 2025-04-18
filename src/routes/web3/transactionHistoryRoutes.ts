import { Router } from 'express';
import { userTxHistory } from '../../controllers/web3/historyController';
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
 * /web3/transaction/history:
 *   get:
 *     summary: Get user transaction history
 *     tags:
 *       - Web3
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Transaction history fetched successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         example: 64f3e4b2c8a0d1f4b8e4e4b2
 *                       user:
 *                         type: string
 *                         example: 64f3e4b2c8a0d1f4b8e4e4b2
 *                       transactionType:
 *                         type: string
 *                         example: SAVE
 *                       amount:
 *                         type: number
 *                         example: 50
 *                       Token:
 *                         type: string
 *                         example: USDC
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         example: 2023-09-01T12:34:56.789Z
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                         example: 2023-09-01T12:34:56.789Z
 *                       __v:
 *                         type: number
 *                         example: 0
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

router.get('/history', authorize, userTxHistory);

export default router;
