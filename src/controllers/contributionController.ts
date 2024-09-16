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

    // Check if wallet has sufficient balance
    if (wallet.balance < amount) {
      throw new BadRequestError("Insufficient funds in the wallet");
    }

    // Deduct the contribution amount from the wallet
    const updatedWallet = await updateWalletService(wallet._id, { balance: wallet.balance - amount });
    if (!updatedWallet) {
      throw new BadRequestError("Failed to update wallet balance");
    }

    // Create the contribution
    const contribution = await createContributionService({
      user: userId,
      paymentPlan,
      contributionPlan,
      amount,
      _id: undefined,
      nextContributionDate: undefined
    });

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
    const userId = req.user.userId;

    // Fetch the user's most recent contribution
    const contribution = await Contribution.findOne({ user: userId }).sort({ createdAt: -1 });

    // Return default values if no contribution is found
    if (!contribution) {
      return res.status(StatusCodes.OK).json({
        balance: 0.00,
        nextContributionDate: null
      });
    }

    const { balance, nextContributionDate } = contribution;

    return res.status(StatusCodes.OK).json({
      balance,
      nextContributionDate
    });
  } catch (error) {
    console.error(error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "An unexpected error occurred." });
  }
};

export const getContributionHistory = async (req: Request, res: Response) => {
  try {
    //@ts-ignore
    const userId = req.user.userId;

    // Fetch contribution history
    const history = await findContributionHistoryService(userId);
    res.status(StatusCodes.OK).json(history);
  } catch (error) {
    console.error(error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "An unexpected error occurred." });
  }
};
