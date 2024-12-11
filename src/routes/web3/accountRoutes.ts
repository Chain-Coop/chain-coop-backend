import {Router} from "express"
import { activate } from "../../controllers/web3/accountController";
import {authorize}  from "../../middlewares/authorization"
const router = Router()


/**
 * @swagger
 * tags:
 *   name: Web3
 *   description: Web3 routes
 */

/**
 * @swagger
 * /web3/activate:
 *   post:
 *     summary: Activate a new Web3 wallet for the user
 *     tags:
 *       - Web3 Accounts
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

router.post("/activate",authorize,activate)

export default router;