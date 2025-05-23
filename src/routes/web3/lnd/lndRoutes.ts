// routes/lndRoutes.ts
import express from 'express';
import * as lndController from '../../../controllers/web3/lnd/lndController';
import { authorize } from '../../../middlewares/authorization';


const router = express.Router();


/**
 * @swagger
 * tags:
 *   name: LND
 *   description: BTC interaction with LND
 */

/**
 * @swagger
 * /web3/lnd/invoice/info:
 *   get:
 *     summary: Retrieve information about the LND node
 *     tags: [LND]
 *     security:
 *       - bearerAuth: []              # if you’re using a bearer token
 *       - macaroonAuth: []            # if you document macaroon header auth
 *     responses:
 *       200:
 *         description: Node info retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 identity_pubkey:
 *                   type: string
 *                   description: Node’s public key
 *                   example: "03a1b2c3d4e5f6..."
 *                 alias:
 *                   type: string
 *                   description: Node’s alias
 *                   example: "mynode"
 *                 num_active_channels:
 *                   type: integer
 *                   description: Number of currently active channels
 *                   example: 12
 *                 num_peers:
 *                   type: integer
 *                   description: Number of connected peers
 *                   example: 23
 *                 block_height:
 *                   type: integer
 *                   description: Current blockchain height
 *                   example: 789123
 *                 synced_to_chain:
 *                   type: boolean
 *                   description: Whether node is fully synced to chain
 *                   example: true
 *                 version:
 *                   type: string
 *                   description: LND software version
 *                   example: "0.15.0-beta"
 *                 uris:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: Public URIs for the node
 *                   example: ["03a1b2c3@1.2.3.4:9735"]
 *       401:
 *         description: Unauthorized – missing or invalid credentials
 *       500:
 *         description: Server error
 */


/**
 * @swagger
 * /web3/lnd/invoice/create:
 *   post:
 *     summary: Create a new Lightning Network invoice
 *     tags: [LND]
 *     security:
 *       - bearerAuth: []
 *       - macaroonAuth: []               # header: Grpc-Metadata-macaroon
 *     requestBody:
 *       description: Invoice data (satoshis, memo, etc.)
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               memo:
 *                 type: string
 *                 description: Optional description for the invoice
 *                 example: "Coffee payment"
 *               amount:
 *                 type: integer
 *                 description: Amount in satoshis
 *                 example: 25000
 *             required:
 *               - value
 *     responses:
 *       201:
 *         description: Invoice created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 r_hash:
 *                   type: string
 *                   description: Payment hash (base64-encoded)
 *                 payment_request:
 *                   type: string
 *                   description: BOLT11 payment request
 *                 add_index:
 *                   type: string
 *                   description: Monotonically increasing invoice index
 *                 payment_addr:
 *                   type: string
 *                   description: Payment address/payment secret (base64)
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized – missing or invalid macaroon
 *       500:
 *         description: Server error
 */


/**
 * @swagger
 * /web3/lnd/invoice/{invoiceId}:
 *   get:
 *     summary: Get a single invoice by its ID
 *     tags: [LND]
 *     parameters:
 *       - in: path
 *         name: invoiceId
 *         required: true
 *         description: The unique identifier (add_index) of the invoice
 *         schema:
 *           type: string
 *           example: "1"
 *     security:
 *       - bearerAuth: []              # adjust if using macaroonAuth
 *     responses:
 *       200:
 *         description: Invoice found successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Invoice'
 *       404:
 *         description: Invoice not found
 *       401:
 *         description: Unauthorized – missing or invalid credentials
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /web3/lnd/invoices/user/{userId}:
 *   get:
 *     summary: Get all invoices for a given user
 *     tags: [LND]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         description: The user's unique identifier
 *         schema:
 *           type: string
 *           example: "60f7a4c8e4b0b12d4c8e4f7a"
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of invoices retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Invoice'
 *       401:
 *         description: Unauthorized – missing or invalid credentials
 *       500:
 *         description: Server error
 */

// Invoice routes
router.post('/invoice/create', authorize, lndController.createInvoice);
router.get('/invoice/:invoiceId', authorize, lndController.getInvoice);
router.get('/invoices/user/:userId', authorize, lndController.getUserInvoice);
// router.get('/invoice/:id',authorize, lndController.getInvoice);
// router.post('/invoice/webhook',authorize, lndController.setupInvoiceWebhook);
// router.post('/invoice/decode', lndController.decodeInvoice);

// // Payment routes
// router.post('/payment/send',authorize, lndController.payInvoice);
// router.get('/channels', authorize,lndController.getChannels);

// router.get('/transactions',authorize, lndController.getTransactions);
// router.get('/userInvoice',authorize, lndController.getUserInvoices);
// router.get('/userPayment',authorize, lndController.getUserPayments);
// router.get('/userWallet',authorize, lndController.getWalletDetails);

// // Wallet routes
// router.get('/wallet/info', authorize,lndController.getWalletInfo);
// router.post('/wallet/address',authorize, lndController.createBitcoinAddress);
export default router;


