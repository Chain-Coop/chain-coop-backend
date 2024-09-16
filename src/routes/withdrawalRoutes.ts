import { Router } from "express";
import { requestWithdrawal } from "../controllers/withdrawalController";
import { collectBankDetails, verifyBankDetails } from "../controllers/walletController";
import { authorize } from "../middlewares/authorization";

const router = Router();

// Route to handle withdrawal requests
router.post("/request-withdrawal", authorize, requestWithdrawal);

// Route to collect bank details
router.post("/collect-bank-details", authorize, collectBankDetails);

// Route to verify bank details
router.post("/verify-bank-details", authorize, verifyBankDetails);

export default router;
