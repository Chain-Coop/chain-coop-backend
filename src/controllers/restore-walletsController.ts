// controllers/wallet.controller.

import { Request, Response } from "express";
import WalletService from "../services/restore-walletsService";


class WalletController {
  static async restoreWallets(req: Request, res: Response) {
    try {
      const { createdCount, userIds } = await WalletService.restoreMissingWallets();

      res.status(200).json({
        message: `${createdCount} wallet(s) restored successfully.`,
        totalWallets: userIds.length,
        walletUserIds: userIds,
      });
    } catch (error) {
      console.error("Error restoring wallets:", error);
      res.status(500).json({
        message: "An error occurred while restoring wallets.",
      });
    }
  }
}

export default WalletController;
