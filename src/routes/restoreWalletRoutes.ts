// routes/wallet.routes.ts

import { Router } from "express";
import WalletController from "../controllers/restore-walletsController";

const router = Router();

// POST /api/wallets/restore
router.post("/restore", WalletController.restoreWallets);

export default router;
