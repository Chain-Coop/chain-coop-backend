import { Router } from 'express';
import CashwyreController from '../../../controllers/web3/cashWyre/cashWyre';
import { authorize } from '../../../middlewares/authorization';
import { CashwyreWebhookController } from '../../../controllers/webhookController';

const router = Router();

/**
 * @swagger
 * /web3/cashwyre/onramp/quote:
 *   post:
 *     summary: Get onramp quote
 *     description: Fetches a quote for converting fiat currency to cryptocurrency
 *     tags: [Cashwyre]
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
 *               - crypto
 *               - network
 *             properties:
 *               amount:
 *                 type: number
 *                 description: The amount in fiat currency to convert
 *                 example: 100
 *               crypto:
 *                 type: string
 *                 description: The cryptocurrency to convert to
 *                 example: "usdt"
 *               network:
 *                 type: string
 *                 description: The blockchain network for the transaction
 *                 example: "bsc"
 *     responses:
 *       200:
 *         description: Quote fetched successfully
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
 *                   example: "Onramp quote fetched successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     reference:
 *                       type: string
 *                       example: "550e8400-e29b-41d4-a716-446655440000"
 *                     cryptoRate:
 *                       type: number
 *                       example: 1.02
 *                     amountInCryptoAsset:
 *                       type: number
 *                       example: 98.04
 *       400:
 *         description: Bad Request
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
 *                   example: "Amount, crypto, and network are required"
 *       500:
 *         description: Internal Server Error
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
 *                   example: "Failed to get onramp quote"
 */

/**
 * @swagger
 * /web3/cashwyre/onramp/confirm:
 *   post:
 *     summary: Confirm onramp quote
 *     description: Confirms a previously fetched onramp quote and initiates the transaction
 *     tags: [Cashwyre]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reference
 *               - transactionReference
 *               - amount
 *               - crypto
 *               - network
 *             properties:
 *               amount:
 *                 type: number
 *                 description: The fiat amount for the transaction
 *                 example: 100
 *               amountInCrypto:
 *                type: number  
 *                description: The amount in cryptocurrency to receive(only for lightning)
 *                example: 0.005
 *               crypto:
 *                 type: string
 *                 description: The cryptocurrency to receive
 *                 example: "usdt"
 *               network:
 *                 type: string
 *                 description: The blockchain network for the transaction
 *                 example: "bsc"
 *               reference:
 *                 type: string
 *                 description: The reference ID from the quote
 *                 example: "550e8400-e29b-41d4-a716-446655440000"
 *               transactionReference:
 *                 type: string
 *                 description: A unique transaction reference
 *                 example: "TX123456789"
 *     responses:
 *       200:
 *         description: Quote confirmed successfully
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
 *                   example: "Onramp quote confirmed successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: "6447b7e02c4815d3a57d79ba"
 *                     userId:
 *                       type: string
 *                       example: "6447b7e02c4815d3a57d79b5"
 *                     reference:
 *                       type: string
 *                       example: "550e8400-e29b-41d4-a716-446655440000"
 *                     transactionReference:
 *                       type: string
 *                       example: "TX123456789"
 *                     fiatAmount:
 *                       type: number
 *                       example: 100
 *                     cryptoAmount:
 *                       type: number
 *                       example: 98.04
 *                     cryptoAsset:
 *                       type: string
 *                       example: "USDC"
 *                     network:
 *                       type: string
 *                       example: "Polygon"
 *                     rate:
 *                       type: number
 *                       example: 1.02
 *                     userAddress:
 *                       type: string
 *                       example: "0x1234567890abcdef1234567890abcdef12345678"
 *                     bankName:
 *                       type: string
 *                       example: "Example Bank"
 *                     accountName:
 *                       type: string
 *                       example: "John Doe"
 *                     accountNumber:
 *                       type: string
 *                       example: "1234567890"
 *                     bankCode:
 *                       type: string
 *                       example: "012"
 *                     status:
 *                       type: string
 *                       example: "NEW"
 *       400:
 *         description: Bad Request
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
 *                   example: "Reference, transaction reference are required"
 *       500:
 *         description: Internal Server Error
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
 *                   example: "Failed to confirm onramp quote"
 */

/**
 * @swagger
 * /web3/cashwyre/offramp/quote:
 *   post:
 *     summary: Get offramp quote
 *     description: Fetches a quote for converting cryptocurrency to fiat currency
 *     tags: [Cashwyre]
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
 *               - crypto
 *               - network
 *             properties:
 *               amount:
 *                 type: number
 *                 description: The amount in cryptocurrency to convert
 *                 example: 100
 *               crypto:
 *                 type: string
 *                 description: The cryptocurrency to convert from
 *                 example: "usdt"
 *               network:
 *                 type: string
 *                 description: The blockchain network for the transaction
 *                 example: "bsc"
 *     responses:
 *       200:
 *         description: Quote fetched successfully
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
 *                   example: "Offramp quote fetched successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     reference:
 *                       type: string
 *                       example: "550e8400-e29b-41d4-a716-446655440000"
 *                     cryptoRate:
 *                       type: number
 *                       example: 0.98
 *                     amountInLocalCurrency:
 *                       type: number
 *                       example: 98.00
 *       400:
 *         description: Bad Request
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
 *                   example: "Amount, crypto, and network are required"
 *       500:
 *         description: Internal Server Error
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
 *                   example: "Failed to get offramp quote"
 */

/**
 * @swagger
 * /web3/cashwyre/offramp/confirm:
 *   post:
 *     summary: Confirm offramp quote
 *     description: Confirms a previously fetched offramp quote and initiates the transaction
 *     tags: [Cashwyre]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reference
 *               - transactionReference
 *               - accountNumber
 *               - accountName
 *               - bankCode
 *               - network
 *             properties:
 *               reference:
 *                 type: string
 *                 description: The reference ID from the quote
 *                 example: "550e8400-e29b-41d4-a716-446655440000"
 *               transactionReference:
 *                 type: string
 *                 description: A unique transaction reference
 *                 example: "TX123456789"
 *               accountNumber:
 *                 type: string
 *                 description: The bank account number to receive funds
 *                 example: "1234567890"
 *               accountName:
 *                 type: string
 *                 description: The name on the bank account
 *                 example: "John Doe"
 *               bankCode:
 *                 type: string
 *                 description: The code of the receiving bank
 *                 example: "012"
 *               tokenId:
 *                 type: string
 *                 description: The ID of the token to be used for the transaction
 *                 example: "1"
 *               network:
 *                 type: string
 *                 description: The ID of the network
 *                 example: "BTC,ETHERLINK,BSC,LISK,POLYGON"
 *     responses:
 *       200:
 *         description: Quote confirmed successfully
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
 *                   example: "Offramp quote confirmed successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: "6447b7e02c4815d3a57d79ba"
 *                     userId:
 *                       type: string
 *                       example: "6447b7e02c4815d3a57d79b5"
 *                     reference:
 *                       type: string
 *                       example: "550e8400-e29b-41d4-a716-446655440000"
 *                     transactionReference:
 *                       type: string
 *                       example: "TX123456789"
 *                     fiatAmount:
 *                       type: number
 *                       example: 98.00
 *                     cryptoAmount:
 *                       type: number
 *                       example: 100
 *                     cryptoAsset:
 *                       type: string
 *                       example: "USDC"
 *                     network:
 *                       type: string
 *                       example: "Polygon"
 *                     rate:
 *                       type: number
 *                       example: 0.98
 *                     bankName:
 *                       type: string
 *                       example: "Example Bank"
 *                     accountName:
 *                       type: string
 *                       example: "John Doe"
 *                     accountNumber:
 *                       type: string
 *                       example: "1234567890"
 *                     bankCode:
 *                       type: string
 *                       example: "012"
 *                     tokenAddress:
 *                       type: string
 *                       example: "0x1234567890abcdef1234567890abcdef12345678"
 *                     offrampAddress:
 *                       type: string
 *                       example: "0xabcdef1234567890abcdef1234567890abcdef12"
 *                     status:
 *                       type: string
 *                       example: "NEW"
 *       400:
 *         description: Bad Request
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
 *                   example: "Reference, transaction reference, account number, account name, bank code and token address are required"
 *       500:
 *         description: Internal Server Error
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
 *                   example: "Failed to confirm offramp quote"
 */

/**
 * @swagger
 * /web3/cashwyre/offramp/transfer:
 *   post:
 *     summary: Process offramp transfer
 *     description: Processes the cryptocurrency transfer for an offramp transaction
 *     tags: [Cashwyre]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - transactionId
 *               - network
 *             properties:
 *               transactionId:
 *                 type: string
 *                 description: The ID of the offramp transaction to process
 *                 example: "6447b7e02c4815d3a57d79ba"
 *               network:
 *                 type: string
 *                 description: The network ID
 *                 example: "BTC,BSC,POLYGON,LISK,ETHERLINK"
 *     responses:
 *       200:
 *         description: Transfer processed successfully
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
 *                   example: "Offramp transfer completed successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     txHash:
 *                       type: string
 *                       example: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"
 *                     statusData:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                           example: "PROCESSING"
 *       400:
 *         description: Bad Request
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
 *                   example: "Insert transaction ID to process offramp"
 *       404:
 *         description: Not Found
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
 *                   example: "Transaction cannot be fetched"
 *       500:
 *         description: Internal Server Error
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
 *                   example: "Failed to process offramp transfer"
 */

/**
 * @swagger
 * /web3/cashwyre/status:
 *   post:
 *     summary: Get transaction status
 *     description: Fetches the current status of a Cashwyre transaction
 *     tags: [Cashwyre]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - transactionId
 *             properties:
 *               transactionId:
 *                 type: string
 *                 description: The ID of the transaction to check
 *                 example: "6447b7e02c4815d3a57d79ba"
 *     responses:
 *       200:
 *         description: Status fetched successfully
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
 *                   example: "Transaction status fetched successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       example: "PROCESSING"
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-05-09T12:00:00Z"
 *       400:
 *         description: Bad Request
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
 *                   example: "Reference and transaction reference are required"
 *       500:
 *         description: Internal Server Error
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
 *                   example: "Failed to get transaction status"
 */

/**
 * @swagger
 * /web3/cashwyre/banks:
 *   get:
 *     summary: Get supported banks
 *     description: Retrieves a list of banks supported by Cashwyre
 *     tags: [Cashwyre]
 *     responses:
 *       200:
 *         description: Banks fetched successfully
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
 *                   example: "Supported banks fetched successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: "044"
 *                       name:
 *                         type: string
 *                         example: "Access Bank"
 *                       code:
 *                         type: string
 *                         example: "044"
 *       500:
 *         description: Internal Server Error
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
 *                   example: "Failed to get supported banks"
 */

/**
 * @swagger
 * /web3/cashwyre/verify-account:
 *   post:
 *     summary: Verify bank account
 *     description: Verifies the existence of a bank account and retrieves the account holder's name
 *     tags: [Cashwyre]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - accountNumber
 *               - bankCode
 *             properties:
 *               accountNumber:
 *                 type: string
 *                 description: The bank account number to verify
 *                 example: "1234567890"
 *               bankCode:
 *                 type: string
 *                 description: The code of the bank
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
 *                   example: "Bank account verified successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     accountName:
 *                       type: string
 *                       example: "John Doe"
 *                     accountNumber:
 *                       type: string
 *                       example: "1234567890"
 *                     bankCode:
 *                       type: string
 *                       example: "044"
 *                     bankName:
 *                       type: string
 *                       example: "Access Bank"
 *       400:
 *         description: Bad Request
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
 *                   example: "Account number and bank code are required"
 *       500:
 *         description: Internal Server Error
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
 *                   example: "Failed to verify bank account"
 */

/**
 * @swagger
 * /web3/cashwyre/transactions:
 *   get:
 *     summary: Get user transactions
 *     description: Retrieves all Cashwyre transactions for the authenticated user
 *     tags: [Cashwyre]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Transactions fetched successfully
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
 *                   example: "Transactions fetched successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         example: "6447b7e02c4815d3a57d79ba"
 *                       userId:
 *                         type: string
 *                         example: "6447b7e02c4815d3a57d79b5"
 *                       reference:
 *                         type: string
 *                         example: "550e8400-e29b-41d4-a716-446655440000"
 *                       transactionReference:
 *                         type: string
 *                         example: "TX123456789"
 *                       transactionType:
 *                         type: string
 *                         example: "ONRAMP"
 *                       fiatAmount:
 *                         type: number
 *                         example: 100
 *                       cryptoAmount:
 *                         type: number
 *                         example: 98.04
 *                       cryptoAsset:
 *                         type: string
 *                         example: "USDC"
 *                       network:
 *                         type: string
 *                         example: "Polygon"
 *                       rate:
 *                         type: number
 *                         example: 1.02
 *                       userAddress:
 *                         type: string
 *                         example: "0x1234567890abcdef1234567890abcdef12345678"
 *                       bankName:
 *                         type: string
 *                         example: "Access Bank"
 *                       accountName:
 *                         type: string
 *                         example: "John Doe"
 *                       accountNumber:
 *                         type: string
 *                         example: "1234567890"
 *                       bankCode:
 *                         type: string
 *                         example: "044"
 *                       tokenAddress:
 *                         type: string
 *                         example: "0x1234567890abcdef1234567890abcdef12345678"
 *                       offrampAddress:
 *                         type: string
 *                         example: "0xabcdef1234567890abcdef1234567890abcdef12"
 *                       status:
 *                         type: string
 *                         example: "SUCCESS"
 *                       txHash:
 *                         type: string
 *                         example: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         example: "2025-05-09T10:00:00Z"
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                         example: "2025-05-09T11:30:00Z"
 *       500:
 *         description: Internal Server Error
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
 *                   example: "Failed to get transactions"
 */

router.post('/onramp/quote', authorize, CashwyreController.getOnrampQuote);
router.post(
  '/onramp/confirm',
  authorize,
  CashwyreController.confirmOnrampQuote
);

// Offramp routes
router.post('/offramp/quote', authorize, CashwyreController.getOfframpQuote);
router.post(
  '/offramp/confirm',
  authorize,
  CashwyreController.confirmOfframpQuote
);
router.post(
  '/offramp/transfer',
  authorize,
  CashwyreController.processOfframpTransfer
);

// Status route
router.post('/status', authorize, CashwyreController.getTransactionStatus);

// Banks routes
router.get('/banks', CashwyreController.getSupportedBanks);
router.post('/verify-account', CashwyreController.verifyBankAccount);

router.get('/transactions', authorize, CashwyreController.getUserTransactions);
router.post('/cashwyre-webhook', CashwyreWebhookController);
export default router;
