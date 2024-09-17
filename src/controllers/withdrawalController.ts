// src/controllers/withdrawalController.ts
import { Request, Response } from "express";
import { findWalletService, updateWalletService } from "../services/walletService";
import { findContributionService, updateContributionService } from "../services/contributionService";
import { BadRequestError } from "../errors";
import { StatusCodes } from "http-status-codes";

export const requestWithdrawal = async (req: Request, res: Response) => {
  try {
    //@ts-ignore
    const userId = req.user.userId;
    const { amount, from } = req.body; // `from` can be 'wallet' or 'contribution'

    if (from === 'wallet') {
      const wallet = await findWalletService({ user: userId });
      if (!wallet || wallet.balance < amount) {
        throw new BadRequestError("Insufficient funds in the wallet");
      }
      // Deduct from wallet
      await updateWalletService(wallet._id, { balance: wallet.balance - amount });

    } else if (from === 'contribution') {
      const contribution = await findContributionService({ user: userId });
      if (!contribution || contribution.balance < amount) {
        throw new BadRequestError("Insufficient funds in the contribution fund");
      }
      // Deduct from contribution fund
      await updateContributionService(contribution._id.toString(), { balance: contribution.balance - amount });

    } else {
      throw new BadRequestError("Invalid withdrawal source");
    }

    res.status(StatusCodes.OK).json({ message: "Withdrawal request processed successfully" });
  } catch (error) {
    if (error instanceof Error) {
      res.status(StatusCodes.BAD_REQUEST).json({ error: error.message });
    } else {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Internal Server Error' });
    }
  }
};
