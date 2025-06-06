// services/wallet.service.ts

import User from "../models/user";
import Wallet from "../models/wallet";

class WalletService {
  static async restoreMissingWallets(): Promise<{ createdCount: number; userIds: string[] }> {
    const users = await User.find({});
    let createdCount = 0;

    for (const user of users) {
      const walletExists = await Wallet.findOne({ user: user._id });
      if (!walletExists) {
        await Wallet.create({
          balance: 0,
          pin: "0000",
          user: user._id,
          isPinCreated: false,
          bankAccounts: [],
          fundedProjects: [],
          hasWithdrawnBefore: false,
          allCards: [],
        });
        createdCount++;
      }
    }

    const wallets = await Wallet.find({}).select("user");
    const userIds = wallets.map((wallet) => wallet.user.toString());

    return { createdCount, userIds };
  }
}

export default WalletService;
