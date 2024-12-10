import { Router } from "express";
import {
  getWalletBalance,
  getWalletHistory,
  // paystackWebhook,
  setWalletPin,
  uploadReceipt,
  fundWallet,
  initiatePayment,
  verifyPayment,
  ChangePin,
  GeneratePinOtp,
  setPreferredCard,
  DeleteCard,
  GetCards,
  verifyAccountDetailsHandler,
} from "../controllers/walletController";
import { authorize } from "../middlewares/authorization";

const router = Router();

/**
 * @swagger
 * /fund-wallet:
 *   post:
 *     summary: Initiate wallet funding payment
 *     description: Initiates a payment for wallet funding via Paystack.
 *     operationId: initiatePayment
 *     tags:
 *       - Wallet
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *                 description: The amount to fund the wallet.
 *                 example: 1000
 *     responses:
 *       200:
 *         description: Payment initiated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Payment initiated successfully
 *                 paymentUrl:
 *                   type: string
 *                   example: "https://paystack.com/payment-url"
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /verify-payment:
 *   post:
 *     summary: Verify payment for wallet funding
 *     description: Verifies a payment transaction after the user completes the payment.
 *     operationId: verifyPayment
 *     tags:
 *       - Wallet
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reference:
 *                 type: string
 *                 description: The reference ID from Paystack after payment.
 *                 example: "PAYSTACK_REF_123"
 *     responses:
 *       200:
 *         description: Payment verified and wallet topped up successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /verify-account-details:
 *   post:
 *     summary: Verify bank account details
 *     description: Verifies the bank account details (account number and bank code).
 *     operationId: verifyAccountDetailsHandler
 *     tags:
 *       - Wallet
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               accountNumber:
 *                 type: string
 *                 example: "1234567890"
 *               bankCode:
 *                 type: string
 *                 example: "011"
 *     responses:
 *       200:
 *         description: Bank account details verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 msg:
 *                   type: string
 *                   example: "Bank details verified"
 *       400:
 *         description: Invalid bank details
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /balance:
 *   get:
 *     summary: Get wallet balance
 *     description: Fetches the current balance of the authenticated user's wallet.
 *     operationId: getWalletBalance
 *     tags:
 *       - Wallet
 *     responses:
 *       200:
 *         description: Successfully fetched wallet balance
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 balance:
 *                   type: number
 *                   example: 2000
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /history:
 *   get:
 *     summary: Get wallet transaction history
 *     description: Fetches the transaction history for the authenticated user's wallet.
 *     operationId: getWalletHistory
 *     tags:
 *       - Wallet
 *     responses:
 *       200:
 *         description: Successfully fetched wallet transaction history
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   amount:
 *                     type: number
 *                   label:
 *                     type: string
 *                   type:
 *                     type: string
 *                   ref:
 *                     type: string
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /create-pin:
 *   post:
 *     summary: Create wallet pin
 *     description: Sets a pin for the authenticated user's wallet.
 *     operationId: setWalletPin
 *     tags:
 *       - Wallet
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               pin:
 *                 type: string
 *                 description: The pin to be set for the wallet.
 *                 example: "1234"
 *     responses:
 *       200:
 *         description: Wallet pin set successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */

router.post("/fund-wallet", authorize, initiatePayment);
router.post("/verify-payment", authorize, verifyPayment);
router.post("/verify-account-details", authorize, verifyAccountDetailsHandler);
router.get("/balance", authorize, getWalletBalance);
router.get("/history", authorize, getWalletHistory);
router.post("/create-pin", authorize, setWalletPin);
router.post("/upload-receipt", authorize, uploadReceipt);
router.post("/generate-pin-otp", authorize, GeneratePinOtp);
router.post("/change-pin", authorize, ChangePin);

router.post("/fund-wallet", authorize, fundWallet);

router
.route("/cards")
  .get(authorize, GetCards)
  .post(authorize, setPreferredCard)
  .delete(authorize, DeleteCard);
export default router;
