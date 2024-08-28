import { Request, Response } from "express";
import {
  createContributionService,
  createContributionHistoryService,
  findContributionHistoryService,
} from "../services/contributionService";
import { findWalletService, updateWalletService } from "../services/walletService";
import { BadRequestError } from "../errors";
import { StatusCodes } from "http-status-codes";

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

export const getContributionHistory = async (req: Request, res: Response) => {
  //@ts-ignore
  const userId = req.user.userId;
  const history = await findContributionHistoryService(userId);
  res.status(StatusCodes.OK).json(history);
};
