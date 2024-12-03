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
	verifyAccountDetailsHandler,
} from "../controllers/walletController";
import { authorize } from "../middlewares/authorization";

const router = Router();

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
	.post(authorize, setPreferredCard)
	.delete(authorize, DeleteCard);
export default router;
