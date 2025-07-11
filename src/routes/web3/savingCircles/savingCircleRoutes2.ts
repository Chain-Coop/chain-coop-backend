import { Router } from 'express';
import {
  createCircles,
  addMemberToCircle,
  deleteMemberFromCircle,
  activateCircle,
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
 *     description: Creates a new saving circle with specified title, description, deposit amount, token, deposit interval, and maximum deposits. The circle is initially created in pending status.
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
 *               - depositAmount
 *               - token
 *               - depositInterval
 *               - maxDeposits
 *               - network
 *             properties:
 *               title:
 *                 type: string
 *                 description: Title of the saving circle
 *                 example: "Monthly Savings Circle"
 *               description:
 *                 type: string
 *                 description: Description of the saving circle
 *                 example: "A monthly savings circle for our group"
 *               depositAmount:
 *                 type: string
 *                 description: Amount to be deposited in the circle
 *                 example: "1000"
 *               token:
 *                 type: string
 *                 description: The token ID (1 for USDT, 2 for USDC)
 *                 example: "1"
 *               depositInterval:
 *                 type: integer
 *                 description: Interval between deposits in seconds
 *                 example: 2592000
 *               maxDeposits:
 *                 type: integer
 *                 description: Maximum number of deposits allowed
 *                 example: 12
 *               network:
 *                 type: string
 *                 description: Network to deploy the circle on
 *                 example: "TBSC or TPOLYGON"
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
 *                   type: object
 *                   description: Created circle object
 *       '400':
 *         description: Bad request, missing parameters or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Provide all required values or Invalid tokenId
 *       '500':
 *         description: Internal server error
 */
router.post('/createCircle', authorize, createCircles);

/**
 * @swagger
 * /web3/savingcircle/addMember:
 *   post:
 *     summary: Add a member to a saving circle
 *     description: Adds a new member to an existing saving circle. Only the circle owner can add members, and members can only be added to off-chain circles.
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
 *               - memberId
 *             properties:
 *               circleId:
 *                 type: string
 *                 description: ID of the saving circle
 *                 example: "64f1a2b3c4d5e6f7g8h9i0j1"
 *               memberId:
 *                 type: string
 *                 description: ID of the member to add
 *                 example: "64f1a2b3c4d5e6f7g8h9i0j2"
 *     responses:
 *       '200':
 *         description: Successfully added member to circle
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Member added successfully
 *                 data:
 *                   type: object
 *                   description: Updated circle object
 *       '400':
 *         description: Bad request - missing parameters, member already in circle, or circle is on-chain
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Member already in circle
 *       '403':
 *         description: Forbidden - only owner can add members
 *       '404':
 *         description: Circle not found
 *       '500':
 *         description: Internal server error
 */
router.post('/addMember', authorize, addMemberToCircle);

/**
 * @swagger
 * /web3/savingcircle/removeMember:
 *   post:
 *     summary: Remove a member from a saving circle
 *     description: Removes a member from an existing saving circle. Only the circle owner can remove members, and members can only be removed from off-chain circles.
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
 *               - memberId
 *             properties:
 *               circleId:
 *                 type: string
 *                 description: ID of the saving circle
 *                 example: "64f1a2b3c4d5e6f7g8h9i0j1"
 *               memberId:
 *                 type: string
 *                 description: ID of the member to remove
 *                 example: "64f1a2b3c4d5e6f7g8h9i0j2"
 *     responses:
 *       '200':
 *         description: Successfully removed member from circle
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Member removed successfully
 *                 data:
 *                   type: object
 *                   description: Updated circle object
 *       '400':
 *         description: Bad request - missing parameters, member not in circle, or circle is on-chain
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Member not in circle
 *       '403':
 *         description: Forbidden - only owner can remove members
 *       '404':
 *         description: Circle not found
 *       '500':
 *         description: Internal server error
 */
router.post('/removeMember', authorize, deleteMemberFromCircle);

/**
 * @swagger
 * /web3/savingcircle/activate:
 *   post:
 *     summary: Activate a saving circle on blockchain
 *     description: Deploys a saving circle to the blockchain, making it active and operational. Only the circle owner can activate a circle.
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
 *               - network
 *             properties:
 *               circleId:
 *                 type: string
 *                 description: ID of the saving circle to activate
 *                 example: "64f1a2b3c4d5e6f7g8h9i0j1"
 *               network:
 *                 type: string
 *                 description: Network to deploy the circle on
 *                 example: "TBSC or TPOLYGON"
 *     responses:
 *       '200':
 *         description: Successfully activated circle
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
 *                   description: Updated circle object with transaction hash and contract ID
 *       '400':
 *         description: Bad request - missing parameters, circle already on-chain, or wallet not activated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Circle is already on-chain
 *       '403':
 *         description: Forbidden - only owner can activate circle
 *       '404':
 *         description: Circle not found
 *       '500':
 *         description: Internal server error
 */
router.post('/activate', authorize, activateCircle);

/**
 * @swagger
 * /web3/savingcircle/depositCircle:
 *   post:
 *     summary: Deposit to a saving circle
 *     description: Deposits the specified amount to a saving circle. Only circle members can deposit.
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
 *               - network
 *             properties:
 *               circleId:
 *                 type: string
 *                 description: ID of the saving circle
 *                 example: "64f1a2b3c4d5e6f7g8h9i0j1"
 *               amount:
 *                 type: string
 *                 description: Amount to deposit
 *                 example: "1000"
 *               network:
 *                 type: string
 *                 description: Network the circle is deployed on
 *                 example: "TBSC or TPOLYGON"
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
 *         description: Bad request - missing parameters, circle not on-chain, or wallet not activated
 *       '403':
 *         description: Forbidden - user is not a member of the circle
 *       '404':
 *         description: Circle not found
 *       '500':
 *         description: Internal server error
 */
router.post('/depositCircle', authorize, depositToCircle);

/**
 * @swagger
 * /web3/savingcircle/withdrawCircle:
 *   post:
 *     summary: Withdraw from a saving circle
 *     description: Withdraws funds from a specified saving circle. Only circle members can withdraw.
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
 *               - network
 *             properties:
 *               circleId:
 *                 type: string
 *                 description: ID of the saving circle
 *                 example: "64f1a2b3c4d5e6f7g8h9i0j1"
 *               network:
 *                 type: string
 *                 description: Network the circle is deployed on
 *                 example: "TBSC or TPOLYGON"
 *     responses:
 *       '200':
 *         description: Successfully withdrew from circle
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
 *         description: Bad request - missing parameters, circle not on-chain, or wallet not activated
 *       '403':
 *         description: Forbidden - user is not a member of the circle
 *       '404':
 *         description: Circle not found
 *       '500':
 *         description: Internal server error
 */
router.post('/withdrawCircle', authorize, withdrawFromCircle);

/**
 * @swagger
 * /web3/savingcircle/setAllowedToken:
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
 *               - network
 *             properties:
 *               token:
 *                 type: string
 *                 description: Token ID to set allowance for (1 for USDC, 2 for USDT)
 *                 example: "1"
 *               allowed:
 *                 type: boolean
 *                 description: Whether the token is allowed (true) or not (false)
 *                 example: true
 *               network:
 *                 type: string
 *                 description: Network to set token allowance on
 *                 example: "TBSC or TPOLYGON"
 *     responses:
 *       '200':
 *         description: Successfully set token allowance
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
 *         description: Bad request - missing parameters, invalid token ID, or wallet not activated
 *       '500':
 *         description: Internal server error
 */
router.post('/setAllowedToken', authorize, setSavingTokenAllowed);

/**
 * @swagger
 * /web3/savingcircle/deleteCircle:
 *   post:
 *     summary: Decommission a saving circle
 *     description: Decommissions a specified saving circle. Only the circle owner can decommission a circle.
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
 *               - network
 *             properties:
 *               circleId:
 *                 type: string
 *                 description: ID of the saving circle to decommission
 *                 example: "64f1a2b3c4d5e6f7g8h9i0j1"
 *               network:
 *                 type: string
 *                 description: Network the circle is deployed on
 *                 example: "TBSC or TPOLYGON"
 *     responses:
 *       '200':
 *         description: Successfully decommissioned circle
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
 *         description: Bad request - missing parameters, circle not on-chain, or wallet not activated
 *       '403':
 *         description: Forbidden - only owner can decommission circle
 *       '404':
 *         description: Circle not found
 *       '500':
 *         description: Internal server error
 */
router.post('/deleteCircle', authorize, decommissionSavingCircle);

/**
 * @swagger
 * /web3/savingcircle/memberBalance/{id}:
 *   get:
 *     summary: Get member balances for a circle
 *     description: Retrieves all member balances for a specified circle from the blockchain
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
 *         description: Contract circle ID on the blockchain
 *         example: "1"
 *       - in: query
 *         name: network
 *         required: true
 *         schema:
 *           type: string
 *         description: Network the circle is deployed on
 *         example: "TBSC or TPOLYGON"
 *     responses:
 *       '200':
 *         description: Successfully retrieved member balances
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
 *                       member:
 *                         type: string
 *                         description: Member wallet address
 *                         example: "0x742d35Cc6634C0532925a3b8D7E4b0ba"
 *                       balance:
 *                         type: string
 *                         description: Member's balance in the circle
 *                         example: "1000000000000000000"
 *       '400':
 *         description: Bad request - wallet not activated
 *       '500':
 *         description: Internal server error
 */
router.get('/memberBalance/:id', authorize, getSavingMemberBalances);

/**
 * @swagger
 * /web3/savingcircle/memberCircles:
 *   get:
 *     summary: Get user's saving circles
 *     description: Retrieves all saving circle IDs from the blockchain that the user is a member of
 *     tags:
 *       - Web3 Saving Circles
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: network
 *         required: true
 *         schema:
 *           type: string
 *         description: Network to query circles from
 *         example: "TBSC or TPOLYGON"
 *     responses:
 *       '200':
 *         description: Successfully retrieved user's circle IDs
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
 *                     type: string
 *                   description: Array of circle IDs from the blockchain
 *                   example: ["1", "2", "3"]
 *       '400':
 *         description: Bad request - wallet not activated
 *       '500':
 *         description: Internal server error
 */
router.get('/memberCircles', authorize, getSavingMemberCircles);

/**
 * @swagger
 * /web3/savingcircle/circleDetails/{id}:
 *   get:
 *     summary: Get details of a saving circle
 *     description: Retrieves detailed information about a specific saving circle from the database. Only circle members can view details.
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
 *         description: Database ID of the saving circle
 *         example: "64f1a2b3c4d5e6f7g8h9i0j1"
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
 *                   example: Success
 *                 data:
 *                   type: object
 *                   description: Details of the saving circle
 *                   properties:
 *                     _id:
 *                       type: string
 *                       description: Database ID of the circle
 *                       example: "64f1a2b3c4d5e6f7g8h9i0j1"
 *                     owner:
 *                       type: string
 *                       description: User ID of the circle owner
 *                       example: "64f1a2b3c4d5e6f7g8h9i0j2"
 *                     members:
 *                       type: array
 *                       description: List of member user IDs
 *                       items:
 *                         type: string
 *                         example: "64f1a2b3c4d5e6f7g8h9i0j3"
 *                     title:
 *                       type: string
 *                       description: Title of the circle
 *                       example: "Monthly Savings Circle"
 *                     description:
 *                       type: string
 *                       description: Description of the circle
 *                       example: "A monthly savings circle for our group"
 *                     depositAmount:
 *                       type: string
 *                       description: Required deposit amount
 *                       example: "1000"
 *                     token:
 *                       type: string
 *                       description: Token contract address
 *                       example: "0x19Ea0584D2A73265251Bf8dC0Bc5A47DebF539ac"
 *                     depositInterval:
 *                       type: integer
 *                       description: Deposit interval in seconds
 *                       example: 2592000
 *                     maxDeposits:
 *                       type: integer
 *                       description: Maximum number of deposits
 *                       example: 12
 *                     status:
 *                       type: string
 *                       description: Current status of the circle
 *                       example: "active"
 *                     isOnChain:
 *                       type: boolean
 *                       description: Whether the circle is deployed on blockchain
 *                       example: true
 *                     contractCircleId:
 *                       type: string
 *                       description: Contract circle ID on blockchain
 *                       example: "1"
 *                     transactionHash:
 *                       type: string
 *                       description: Transaction hash of circle creation
 *                       example: "0x123abc..."
 *                     circleStart:
 *                       type: string
 *                       format: date-time
 *                       description: Circle start date
 *                       example: "2024-01-15T10:30:00Z"
 *       '400':
 *         description: Bad request - missing circle ID
 *       '403':
 *         description: Forbidden - user is not a member of the circle
 *       '404':
 *         description: Circle not found
 *       '500':
 *         description: Internal server error
 */
router.get('/circleDetails/:id', authorize, getSavingCircle);

export default router;