import { Router } from 'express';
import {
  createCircles,
  depositToCircle,
  withdrawFromCircle,
  setSavingTokenAllowed,
  getSavingMemberBalances,
  getSavingMemberCircles,
  getSavingCircle,
  decommissionSavingCircle,
} from '../../../controllers/web3/savingcircles/savingController';
import { authorize } from '../../../middlewares/authorization';
const router = Router();

/**
 * @swagger
 * /web3/savingcircle/createCircle:
 *   post:
 *     summary: Create a new saving circle
 *     description: Creates a new saving circle with specified members, deposit amount, token, deposit interval, and maximum deposits
 *     tags:
 *       - Web3 Saving Circles
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - members
 *               - depositAmount
 *               - token
 *               - depositInterval
 *               - maxDeposits
 *             properties:
 *               members:
 *                 type: array
 *                 description: Array of member addresses to be included in the circle
 *                 items:
 *                   type: string
 *               depositAmount:
 *                 type: string
 *                 description: Amount to be deposited in the circle
 *               token:
 *                 type: string
 *                 description: The token ID (1 for USDC, 2 for Lisk Token)
 *               depositInterval:
 *                 type: integer
 *                 description: Interval between deposits
 *               maxDeposits:
 *                 type: integer
 *                 description: Maximum number of deposits allowed
 *     responses:
 *       '200':
 *         description: Successfully created saving circle
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
 *                   description: Transaction hash
 *       '400':
 *         description: Bad request, missing parameters or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Provide all required values or Please activate wallet
 *       '500':
 *         description: Internal server error
 */
router.post('/createCircle', authorize, createCircles);

/**
 * @swagger
 * /web3/savingcircle/depositCircle:
 *   post:
 *     summary: Deposit to a saving circle
 *     description: Deposits the specified amount to a saving circle
 *     tags:
 *       - Web3 Saving Circles
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - circleId
 *               - amount
 *             properties:
 *               circleId:
 *                 type: string
 *                 description: ID of the saving circle
 *               amount:
 *                 type: string
 *                 description: Amount to deposit
 *     responses:
 *       '200':
 *         description: Successfully deposited to circle
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
 *                   description: Transaction hash
 *       '400':
 *         description: Bad request, missing parameters
 *       '500':
 *         description: Internal server error
 */
router.post('/depositCircle', authorize, depositToCircle);

/**
 * @swagger
 * /web3/savingcircle/withdrawCircle:
 *   post:
 *     summary: Withdraw from a saving circle
 *     description: Withdraws funds from a specified saving circle
 *     tags:
 *       - Web3 Saving Circles
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - circleId
 *             properties:
 *               circleId:
 *                 type: string
 *                 description: ID of the saving circle
 *     responses:
 *       '200':
 *         description: Successfully withdrew from circle
 *       '400':
 *         description: Bad request, missing parameters
 *       '500':
 *         description: Internal server error
 */
router.post('/withdrawCircle', authorize, withdrawFromCircle);

/**
 * @swagger
 * /web3/savingcircle/setAllowedTOken:
 *   post:
 *     summary: Set token allowance for saving circles
 *     description: Sets whether a token is allowed for use in saving circles
 *     tags:
 *       - Web3 Saving Circles
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - allowed
 *             properties:
 *               token:
 *                 type: string
 *                 description: Token address to set allowance for
 *               allowed:
 *                 type: boolean
 *                 description: Whether the token is allowed (true) or not (false)
 *     responses:
 *       '200':
 *         description: Successfully set token allowance
 *       '400':
 *         description: Bad request, missing parameters
 *       '500':
 *         description: Internal server error
 */
router.post('/setAllowedTOken', authorize, setSavingTokenAllowed);

/**
 * @swagger
 * /web3/savingcircle/deleteCircle:
 *   post:
 *     summary: Decommission a saving circle
 *     description: Decommissions a specified saving circle
 *     tags:
 *       - Web3 Saving Circles
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - circleId
 *             properties:
 *               circleId:
 *                 type: string
 *                 description: ID of the saving circle to decommission
 *     responses:
 *       '200':
 *         description: Successfully decommissioned circle
 *       '400':
 *         description: Bad request, missing parameters
 *       '500':
 *         description: Internal server error
 */
router.post('/deleteCircle', authorize, decommissionSavingCircle);

/**
 * @swagger
 * /web3/savingcircle/memberBalance/{id}:
 *   get:
 *     summary: Get member balances for a circle
 *     description: Retrieves all member balances for a specified circle
 *     tags:
 *       - Web3 Saving Circles
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the saving circle
 *         example: "1"
 *     responses:
 *       '200':
 *         description: Successfully retrieved member balances
 *       '400':
 *         description: Bad request, missing parameters
 *       '500':
 *         description: Internal server error
 */
router.get('/memberBalance/:id', authorize, getSavingMemberBalances);

/**
 * @swagger
 * /web3/savingcircle/memberCircles:
 *   get:
 *     summary: Get user's saving circles
 *     description: Retrieves all saving circle ids the user is a member of
 *     tags:
 *       - Web3 Saving Circles
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Successfully retrieved user's circle Ids
 *       '400':
 *         description: Bad request
 *       '500':
 *         description: Internal server error
 */
router.get('/memberCircles', authorize, getSavingMemberCircles);

/**
 * @swagger
 * /web3/savingcircle/circleDetails/{id}:
 *   get:
 *     summary: Get details of a saving circle
 *     description: Retrieves detailed information about a specific saving circle
 *     tags:
 *       - Web3 Saving Circles
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the saving circle
 *         example: "1"
 *     responses:
 *       '200':
 *         description: Successfully retrieved circle details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Circle details retrieved successfully"
 *                 circle:
 *                   type: object
 *                   description: Details of the saving circle
 *                   properties:
 *                     owner:
 *                       type: string
 *                       description: Address of the circle owner
 *                       example: "0xFC19Df3441BaE69296D6D2997c17959E8EFb83a3"
 *                     members:
 *                       type: array
 *                       description: List of circle members
 *                       items:
 *                         type: string
 *                         example: "0xf04990915C006A35092493094B4367F6d93f9ff0"
 *                     currentIndex:
 *                       type: integer
 *                       description: Current index in the deposit rotation
 *                       example: 0
 *                     depositAmount:
 *                       type: string
 *                       description: Required deposit amount (in smallest unit)
 *                       example: "2000000000000000000"
 *                     token:
 *                       type: string
 *                       description: Token address used for deposits
 *                       example: "0x19Ea0584D2A73265251Bf8dC0Bc5A47DebF539ac"
 *                     depositInterval:
 *                       type: integer
 *                       description: Deposit interval in seconds
 *                       example: 300
 *                     circleStart:
 *                       type: integer
 *                       description: Circle start timestamp (UNIX)
 *                       example: 1741704223
 *                     maxDeposits:
 *                       type: integer
 *                       description: Maximum number of deposits
 *                       example: 2
 *       '400':
 *         description: Bad request, missing parameters
 *       '500':
 *         description: Internal server error
 */
router.get('/circleDetails/:id', authorize, getSavingCircle);

export default router;
