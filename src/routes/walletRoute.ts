import { Router } from "express";
import {
    getWalletBalance,
    getWalletHistory,
    paystackWebhook,
    setWalletPin,
    uploadReceipt,
    collectBankDetailsHandler,
    verifyBankDetailsHandler
} from "../controllers/walletController";
import { authorize } from "../middlewares/authorization";

const router = Router();


router.post("/webhook", paystackWebhook);
router.get("/balance", authorize, getWalletBalance);
router.get("/history", authorize, getWalletHistory);
router.post("/create-pin", authorize, setWalletPin);
router.post("/upload-receipt", authorize, uploadReceipt);
router.post("/collect-bank-details", authorize, collectBankDetailsHandler);
router.post("/verify-bank-details", authorize, verifyBankDetailsHandler);

export default router;
