import { Request, Response } from "express";
import {
  createContributionService,
  createContributionHistoryService,
  findContributionHistoryService,
} from "../services/contributionService";
import { findWalletService, updateWalletService } from "../services/walletService";
import { BadRequestError } from "../errors";
import { StatusCodes } from "http-status-codes";
import Contribution from '../models/contribution';

export const createContribution = async (req: Request, res: Response) => {
  try {
    const { paymentPlan, contributionPlan, amount } = req.body;
    //@ts-ignore
    const userId = req.user.userId;

    // Fetch the user's wallet
    const wallet = await findWalletService({ user: userId });
    if (!wallet) {
      throw new BadRequestError("Wallet not found");
    }

    // Log the wallet balance
    console.log(`Wallet Balance: ${wallet.balance}`);

    if (wallet.balance < amount) {
      throw new BadRequestError("Insufficient funds in the wallet");
    }

    // Create the contribution
    const contribution = await createContributionService({
      user: userId,
      paymentPlan,
      contributionPlan,
      amount,
      _id: undefined,
      nextContributionDate:  undefined // Adjust as needed
    });

    // Deduct the contribution amount from the wallet
    const updatedWallet = await updateWalletService(wallet._id, { balance: wallet.balance - amount });
    if (!updatedWallet) {
      throw new BadRequestError("Failed to update wallet balance");
    }

    // Log the updated wallet balance
    console.log(`Updated Wallet Balance: ${updatedWallet.balance}`);


    // Check if the wallet update was successful
    if (!updatedWallet) {
      throw new BadRequestError("Failed to update wallet balance");
    }

    // Log the updated wallet balance
    console.log(`Updated Wallet Balance: ${updatedWallet.balance}`);

    // Log the contribution history
    await createContributionHistoryService(contribution._id.toString(), userId, amount, "Pending");

    // Respond to the client
    res.status(StatusCodes.CREATED).json({ message: "Contribution created successfully", contribution });
  } catch (error) {
    console.error(error);
    res.status(error instanceof BadRequestError ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR).json({ error: (error as Error).message });
  }
};
export const getContributionDetails = async (req: Request, res: Response) => {
  try {
     //@ts-ignore
    const userId = req.user._id;
       //@ts-ignore
    const contribution = await Contribution.findOne({ user: userId }).sort({ createdAt: -1 });

    if (!contribution) {
      // Return default balance if no contributions found
      return res.status(200).json({
        balance: 0.00,
        nextContributionDate: null
      });
    }

    const { balance, nextContributionDate } = contribution;

    return res.status(200).json({
      balance,
      nextContributionDate
    });
  } catch (error) {
    return res.status(500).json({ error: "An unexpected error occurred." });
  }
};

export const getContributionHistory = async (req: Request, res: Response) => {
  //@ts-ignore
  const userId = req.user.userId;
  const history = await findContributionHistoryService(userId);
  res.status(StatusCodes.OK).json(history);
};