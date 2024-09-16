import { Router } from "express";
import {
    getWalletBalance,
    getWalletHistory,
    paystackWebhook,
    setWalletPin,
    uploadReceipt,
    collectBankDetails,  
    verifyBankDetails,   
    //withdrawFromWallet,  
} from "../controllers/walletController";
import { authorize } from "../middlewares/authorization";

const router = Router();

router.post("/webhook", paystackWebhook);
router.get("/balance", authorize, getWalletBalance);
router.get("/history", authorize, getWalletHistory);
router.post("/create-pin", authorize, setWalletPin);
router.post("/upload-receipt", authorize, uploadReceipt);

// New routes for collecting and verifying bank details
router.post("/collect-bank-details", authorize, collectBankDetails); 
router.post("/verify-bank-details", authorize, verifyBankDetails);

// Route for withdrawing from wallet
//router.post("/withdraw", authorize, withdrawFromWallet);

export default router;
