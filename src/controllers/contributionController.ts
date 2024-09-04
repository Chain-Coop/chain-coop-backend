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
  const { paymentPlan, contributionPlan, amount } = req.body;
  //@ts-ignore
  const userId = req.user.userId;

  const wallet = await findWalletService({ user: userId });
  if (!wallet || wallet.balance < amount) {
    throw new BadRequestError("Insufficient funds in the wallet");
  }

  // Create contribution
  const contribution = await createContributionService({
    user: userId,
    paymentPlan,
    contributionPlan,
    amount,
  });

  // Deduct from wallet
  await updateWalletService(wallet._id, { balance: wallet.balance - amount });

  // Log contribution history
  await createContributionHistoryService(contribution._id.toString(), userId, amount, "Pending");

  res.status(StatusCodes.CREATED).json({ message: "Contribution created successfully", contribution });
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

