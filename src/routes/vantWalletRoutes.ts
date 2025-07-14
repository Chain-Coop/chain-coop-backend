
import express from "express";
import VantController from "../controllers/vantWalletController";
import { authorize } from "../middlewares/authorization";
import { VantWebhookController } from "../controllers/webhookController";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Vant Wallet
 *   description: API endpoints for Vant reserved wallet management and operations.
 */

/**
 * @swagger
 * /vant/create-wallet:
 *   post:
 *     summary: Create Wallet
 *     description: Create a new reserved wallet for the authenticated user using Vant API. This is an asynchronous operation that will send a webhook notification when completed.
 *     tags: [Vant Wallet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstname
 *               - lastname
 *               - phone
 *               - email
 *               - bvn
 *               - dob
 *             properties:
 *               firstname:
 *                 type: string
 *                 description: User's first name
 *                 example: "Joshua"
 *               lastname:
 *                 type: string
 *                 description: User's last name
 *                 example: "Isaac"
 *               phone:
 *                 type: string
 *                 description: User's phone number in format +234XXXXXXXXXX
 *                 example: "+2348160765447"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *                 example: "joshua@example.com"
 *               bvn:
 *                 type: string
 *                 description: Bank Verification Number (11 digits)
 *                 example: "12345678901"
 *               dob:
 *                 type: string
 *                 format: date
 *                 description: Date of birth in YYYY-MM-DD format
 *                 example: "1990-01-15"
 *     responses:
 *       200:
 *         description: Reserved wallet creation request submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "BVN lookup and account creation are being processed"
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: "60d5ecb74b24a5001f5e4e1a"
 *                     userId:
 *                       type: string
 *                       example: "60d5ecb74b24a5001f5e4e1b"
 *                     name:
 *                       type: string
 *                       example: "Joshua-Isaac"
 *                     firstname:
 *                       type: string
 *                       example: "Joshua"
 *                     lastname:
 *                       type: string
 *                       example: "Isaac"
 *                     phone:
 *                       type: string
 *                       example: "+2348160765447"
 *                     email:
 *                       type: string
 *                       example: "joshua@example.com"
 *                     status:
 *                       type: string
 *                       example: "pending"
 *       400:
 *         description: Bad request - Invalid input data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "All fields are required: firstname, lastname, phone, email, bvn, dob"
 *       401:
 *         description: Unauthorized - Invalid or missing authentication token
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /vant/get-wallet:
 *   get:
 *     summary: Get User's Wallet
 *     description: Retrieve the reserved wallet for the authenticated user
 *     tags: [Vant Wallet]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Reserved wallet retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Reserved wallet retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: "60d5ecb74b24a5001f5e4e1a"
 *                     userId:
 *                       type: string
 *                       example: "60d5ecb74b24a5001f5e4e1b"
 *                     name:
 *                       type: string
 *                       example: "Pakam-JOSHUA937"
 *                     firstname:
 *                       type: string
 *                       example: "JOSHUA"
 *                     lastname:
 *                       type: string
 *                       example: "ISAAC"
 *                     phone:
 *                       type: string
 *                       example: "+2348160765447"
 *                     email:
 *                       type: string
 *                       example: "joshua@example.com"
 *                     wallet_balance:
 *                       type: number
 *                       example: 0
 *                     account_numbers:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           account_name:
 *                             type: string
 *                             example: "MERCHANT(JOSHUA ISAAC)"
 *                           account_number:
 *                             type: string
 *                             example: "9977573760"
 *                           bank:
 *                             type: string
 *                             example: "Providus"
 *                     status:
 *                       type: string
 *                       enum: [pending, active, failed]
 *                       example: "active"
 *       404:
 *         description: No reserved wallet found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /vant/wallet-balance:
 *   get:
 *     summary: Get Wallet Balance
 *     description: Retrieve the current balance and account details for the user's reserved wallet
 *     tags: [Vant Wallet]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Wallet balance retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Wallet balance retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     wallet_balance:
 *                       type: number
 *                       example: 25000
 *                     account_numbers:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           account_name:
 *                             type: string
 *                             example: "MERCHANT(JOSHUA ISAAC)"
 *                           account_number:
 *                             type: string
 *                             example: "9977573760"
 *                           bank:
 *                             type: string
 *                             example: "Providus"
 *                     status:
 *                       type: string
 *                       example: "active"
 *       404:
 *         description: No active reserved wallet found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /vant/verify-account:
 *   post:
 *     summary: Verify Beneficiary Account
 *     description: Verify a bank account number and bank code to get account details before making a transfer
 *     tags: [Vant Wallet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - account_number
 *               - bank_code
 *             properties:
 *               account_number:
 *                 type: string
 *                 description: The account number to verify
 *                 example: "0123456789"
 *               bank_code:
 *                 type: string
 *                 description: The bank code
 *                 example: "044"
 *     responses:
 *       200:
 *         description: Account verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Account verified successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                       example: "John Doe"
 *                     bank:
 *                       type: string
 *                       example: "Access Bank"
 *                     account_number:
 *                       type: string
 *                       example: "0123456789"
 *       400:
 *         description: Bad request - Missing required fields
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /vant/transfer:
 *   post:
 *     summary: Transfer Funds
 *     description: Transfer funds from user's reserved wallet to another bank account
 *     tags: [Vant Wallet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - account_number
 *               - bank_code
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email for transfer notification
 *                 example: "recipient@example.com"
 *               amount:
 *                 type: number
 *                 description: Amount to transfer (must be greater than 0)
 *                 example: 5000
 *               account_number:
 *                 type: string
 *                 description: Recipient's account number
 *                 example: "0123456789"
 *               bank_code:
 *                 type: string
 *                 description: Recipient's bank code
 *                 example: "044"
 *               narration:
 *                 type: string
 *                 description: Transfer description/narration
 *                 example: "Payment for services"
 *     responses:
 *       200:
 *         description: Transfer completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Transfer completed successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     reference:
 *                       type: string
 *                       example: "PAY_1234567890_abcdef123"
 *                     amount:
 *                       type: number
 *                       example: 5000
 *                     status:
 *                       type: string
 *                       example: "success"
 *                     recipient_details:
 *                       type: object
 *                       properties:
 *                         name:
 *                           type: string
 *                           example: "John Doe"
 *                         account_number:
 *                           type: string
 *                           example: "0123456789"
 *                         bank:
 *                           type: string
 *                           example: "Access Bank"
 *       400:
 *         description: Bad request - Invalid input, insufficient balance, or no active wallet
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /vant/transfer-history:
 *   get:
 *     summary: Get Transfer History
 *     description: Retrieve paginated transfer history for the authenticated user
 *     tags: [Vant Wallet]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           minimum: 1
 *           maximum: 100
 *         description: Number of records to retrieve per page
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *         description: Page number to retrieve
 *     responses:
 *       200:
 *         description: Transfer history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Transfer history retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     transactions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             example: "60d5ecb74b24a5001f5e4e1a"
 *                           reference:
 *                             type: string
 *                             example: "PAY_1234567890_abcdef123"
 *                           amount:
 *                             type: number
 *                             example: 5000
 *                           recipient_name:
 *                             type: string
 *                             example: "John Doe"
 *                           recipient_account:
 *                             type: string
 *                             example: "0123456789"
 *                           bank:
 *                             type: string
 *                             example: "Access Bank"
 *                           status:
 *                             type: string
 *                             example: "success"
 *                           narration:
 *                             type: string
 *                             example: "Payment for services"
 *                           created_at:
 *                             type: string
 *                             format: date-time
 *                             example: "2023-06-15T10:30:00Z"
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                           example: 1
 *                         limit:
 *                           type: integer
 *                           example: 10
 *                         total:
 *                           type: integer
 *                           example: 25
 *                         pages:
 *                           type: integer
 *                           example: 3
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /vant/banks:
 *   get:
 *     summary: Get Supported Banks
 *     description: Retrieve list of all supported banks for transfers
 *     tags: [Vant Wallet]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Banks retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Banks retrieved successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                         example: "Access Bank"
 *                       code:
 *                         type: string
 *                         example: "044"
 *                       slug:
 *                         type: string
 *                         example: "access-bank"
 *                       logo:
 *                         type: string
 *                         example: "https://example.com/logo.png"
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */



/**
 * @swagger
 * /vant/vant-webhook:
 *   post:
 *     summary: Vant Webhook
 *     description: Create a new reserved wallet for the authenticated user using Vant API. This is an asynchronous operation that will send a webhook notification when completed.
 *     tags: [Vant Wallet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstname
 *               - lastname
 *               - phone
 *               - email
 *               - bvn
 *               - dob
 *             properties:
 *               firstname:
 *                 type: string
 *                 description: User's first name
 *                 example: "Joshua"
 *               lastname:
 *                 type: string
 *                 description: User's last name
 *                 example: "Isaac"
 *               phone:
 *                 type: string
 *                 description: User's phone number in format +234XXXXXXXXXX
 *                 example: "+2348160765447"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *                 example: "joshua@example.com"
 *               bvn:
 *                 type: string
 *                 description: Bank Verification Number (11 digits)
 *                 example: "12345678901"
 *               dob:
 *                 type: string
 *                 format: date
 *                 description: Date of birth in YYYY-MM-DD format
 *                 example: "1990-01-15"
 *     responses:
 *       200:
 *         description: Reserved wallet creation request submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "BVN lookup and account creation are being processed"
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: "60d5ecb74b24a5001f5e4e1a"
 *                     userId:
 *                       type: string
 *                       example: "60d5ecb74b24a5001f5e4e1b"
 *                     name:
 *                       type: string
 *                       example: "Joshua-Isaac"
 *                     firstname:
 *                       type: string
 *                       example: "Joshua"
 *                     lastname:
 *                       type: string
 *                       example: "Isaac"
 *                     phone:
 *                       type: string
 *                       example: "+2348160765447"
 *                     email:
 *                       type: string
 *                       example: "joshua@example.com"
 *                     status:
 *                       type: string
 *                       example: "pending"
 *       400:
 *         description: Bad request - Invalid input data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "All fields are required: firstname, lastname, phone, email, bvn, dob"
 *       401:
 *         description: Unauthorized - Invalid or missing authentication token
 *       500:
 *         description: Internal server error
 */


// Routes for reserved wallet operations
router.post("/create-wallet", authorize, VantController.createReservedWallet);
router.get("/get-wallet", authorize, VantController.getUserReservedWallet);
router.get("/wallet-balance", authorize, VantController.getWalletBalance);
router.post("/verify-account", authorize, VantController.verifyAccount);
router.post("/transfer", authorize, VantController.transferFunds);
router.get("/transfer-history", authorize, VantController.getAllTransactions);
router.get("/banks", authorize, VantController.getBanks);
router.post('/vant-webhook', VantWebhookController);



export default router;