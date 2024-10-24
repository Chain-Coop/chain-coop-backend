import { Request, Response } from "express";
import {
  createContributionService,
  createContributionHistoryService,
  findContributionHistoryService,
  calculateNextContributionDate,
  findContributionService,
  processRecurringContributions,
  verifyContributionPayment,
} from "../services/contributionService";
import {
  createWalletHistoryService,
  findWalletService,
  iWalletHistory,
  updateWalletService,
  validateWalletPin,
} from "../services/walletService";
import { BadRequestError, NotFoundError } from "../errors";
import { StatusCodes } from "http-status-codes";
import { validateCreateContribution } from "../utils/requestValidator";
import { ObjectId } from "mongoose";
import Contribution from "../models/contribution";


export interface iContribution {
  endDate: any | Date | undefined;
  startDate: any | Date | undefined;
  savingsCategory: any | string;
  _id?: ObjectId;
  user: ObjectId;
  contributionPlan: string;
  amount: number;
  status?: string;
  bankDetails?: {
    accountNumber: string;
    bankCode: string;
  };
  balance?: number;
  categoryBalances?: Map<string, number>;
  nextContributionDate?: Date;
  lastContributionDate?: Date;
}

export const createContribution = async (req: Request, res: Response) => {
  const { amount, contributionPlan, savingsCategory, startDate, endDate } = req.body;
  //@ts-ignore
  const email = req.user.email; 
  //@ts-ignore
  const userId = req.user.userId; 

  if (!amount || !email || !contributionPlan || !savingsCategory || !startDate || !endDate) {
      throw new BadRequestError("All fields are required");
  }

  try {
      const result = await createContributionService({
        amount,
        contributionPlan,
        savingsCategory,
        startDate,
        endDate,
        email,
        user: userId,
      });

      console.log("Payload:", { amount, contributionPlan, savingsCategory, startDate, endDate, email, user: userId });
      console.log("Response:", result);

      res.status(StatusCodes.OK).json(result);
  } catch (error: any) {
      console.error("Error in createContribution:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          message: "Failed to create contribution and initiate payment",
          error: error.message,
      });
  }
};

export const verifyContribution = async (req: Request, res: Response) => {
  const reference = req.query.reference as string;

  if (!reference) {
      throw new BadRequestError("Payment reference is required");
  }

  try {
      await verifyContributionPayment(reference); 
      res.status(StatusCodes.OK).json({
          message: "Payment successful. Contribution has been made.",
      });
  } catch (error: any) {
      console.error("Error in verifyContribution:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          message: "Failed to verify contribution payment",
          error: error.message,
      });
  }
};

export const handleRecurringContributions = async () => {
  try {
    await processRecurringContributions();
  } catch (error) {
    console.error("Error processing recurring contributions:", error);
  }
};



export const getContributionDetails = async (req: Request, res: Response) => {
  try {
    //@ts-ignore
    const userId = req.user.userId;

    const contribution = await findContributionService({ user: userId });

    if (!contribution) {
      return res.status(StatusCodes.OK).json({
        balance: 0,
        nextContributionDate: null,
      });
    }

    const { balance, nextContributionDate } = contribution;

    return res.status(StatusCodes.OK).json({
      balance,
      nextContributionDate,
    });
  } catch (error) {
    console.error("Error fetching contribution details:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: "An unexpected error occurred while fetching contribution details.",
    });
  }
};

export const getContributionHistory = async (req: Request, res: Response) => {
  try {
    //@ts-ignore
    const userId = req.user.userId;

    const history = await findContributionHistoryService(userId);

    console.log("Contribution history:", history);

    const combinedHistory: { [key: string]: any } = {};
    let totalBalance = 0;

    for (const contribution of history) {
      //@ts-ignore
      const category = contribution.savingsCategory;

      if (!combinedHistory[category]) {
        combinedHistory[category] = {
          contribution: contribution._id,
          user: contribution.user,
          contributionPlan: contribution.contributionPlan,
          savingsCategory: category,
          SavingsName: category,
          Balance: 0,
          startDate: contribution.startDate,
          endDate: contribution.endDate,
          status: contribution.status,
          nextContributionDate: contribution.nextContributionDate,
          lastContributionDate: contribution.lastContributionDate,
          //@ts-ignore
          createdAt: contribution.createdAt,
          //@ts-ignore
          updatedAt: contribution.updatedAt,
        };
      }

      combinedHistory[category].Balance += contribution.amount;
      totalBalance += contribution.amount;
    }

    const formattedHistory = Object.values(combinedHistory);

    const response = {
      statusCode: StatusCodes.OK,
      totalBalance, 
      contributions: formattedHistory,
    };

    res.status(StatusCodes.OK).json(response);
  } catch (error) {
    console.error("Error fetching contribution history:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: "An unexpected error occurred while fetching contribution history.",
    });
  }
};

export const withdrawContribution = async (req: Request, res: Response) => {
  //@ts-ignore
  const wallet = await findWalletService({ user: req.user.userId });
  //@ts-ignore
  const contribution = await findContributionService({ user: req.user.userId });

  if (!wallet || !contribution) {
    throw new NotFoundError("Wallet not found");
  }

  const { amount } = req.body;

  if (contribution.balance < amount || amount <= 0) {
    throw new BadRequestError("Insufficient funds in wallet");
  }

  contribution.balance -= amount;
  wallet.balance += amount;

  const historyPayload : iWalletHistory = {
    amount,
    label: "Withdrawal from Contribution",
    type: "credit",
    ref: "Self",
    //@ts-ignore
    user: req.user.userId,
  };

  await createWalletHistoryService(historyPayload);

  await contribution.save();
  await wallet.save();

  res.status(StatusCodes.OK).json({
    message: "Transfer successful. Proceed to your wallet to complete the withdrawal process."
  });


};


export const getContributionsByCategory = async (req: Request, res: Response) => {
    const { category } = req.params;

    try {
        //@ts-ignore
        if (!req.user || !req.user.userId) {
            return res.status(StatusCodes.UNAUTHORIZED).json({
                message: "Unauthorized: User not found.",
            });
        }
        //@ts-ignore
        const userId = req.user.userId;

        const contributions = await Contribution.find({
            user: userId,
            savingsCategory: category,
        });

        if (!contributions || contributions.length === 0) {
            return res.status(StatusCodes.NOT_FOUND).json({
                message: "No contributions found for this category.",
            });
        }

        const totalBalance = contributions.reduce((sum, contribution) => {
            return sum + contribution.amount;
        }, 0);

        const filteredContribution = contributions.reduce((prev, current) => {
            return (prev.amount > current.amount) ? prev : current;
        });

        const response = {
            statusCode: StatusCodes.OK,
            totalBalance: totalBalance,
            contributions: [
                {
                    contribution: filteredContribution._id,
                    user: filteredContribution.user,
                    contributionPlan: filteredContribution.contributionPlan,
                    savingsCategory: filteredContribution.savingsCategory,
                    startDate: filteredContribution.startDate,
                    endDate: filteredContribution.endDate,
                    status: filteredContribution.status,
                    nextContributionDate: filteredContribution.nextContributionDate,
                    lastContributionDate: filteredContribution.lastContributionDate,
                    //@ts-ignore
                    createdAt: filteredContribution.createdAt,
                    //@ts-ignore
                    updatedAt: filteredContribution.updatedAt,
                }
            ]
        };

        // Return a 200 OK status with the response
        return res.status(StatusCodes.OK).json(response);
    } catch (error) {
        console.error("Error fetching contributions by category:", error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            error: "An unexpected error occurred while fetching contributions.",
        });
    }
};
