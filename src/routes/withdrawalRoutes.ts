import { Router } from "express";
import {
  requestWithdrawal,
  updateWithdrawalStatusController,
  listAllWithdrawals,
  getUserBankAccountsController,
} from "../controllers/withdrawalController";
import {
  collectBankDetails,
  verifyBankDetails,
} from "../controllers/walletController";
import { getAllBanks } from "../controllers/bankController";
import { authorize, authorizePermissions } from "../middlewares/authorization";

const router = Router();

// GET route to get all banks
router.get("/all-banks", authorize, getAllBanks);

// Route to handle withdrawal requests
router.post("/request-withdrawal", authorize, requestWithdrawal);

// Route to collect bank details
router.post("/collect-bank-details", authorize, collectBankDetails);

// POST route to verify bank account details
router.post("/verify-bank-account", authorize, verifyBankDetails);

// PATCH route to update withdrawal status (admin only)
router.patch(
  "/update-status/:withdrawalId",
  updateWithdrawalStatusController
);

router.get("/requests",  listAllWithdrawals);

router.get("/user-bank-accounts", authorize, getUserBankAccountsController);

export default router;
