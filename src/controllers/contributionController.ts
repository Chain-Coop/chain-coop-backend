import { Request, Response } from "express";
import {
  createContributionService,
  createContributionHistoryService,
  findContributionHistoryService,
  calculateNextContributionDate,
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
import ContributionHistory from "../models/contributionHistory";

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



export const getTotalBalance = async (req: Request, res: Response) => {
  try {
    //@ts-ignore
    const userId = req.user.userId;

    const history = await ContributionHistory.find({ user: userId });

    const totalBalance = history.reduce((sum, contribution) => sum + contribution.amount, 0);

    res.status(200).json({ totalBalance });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching total contribution balance' });
  }
};



export const deleteAllContributions = async (req: Request, res: Response) => {
  try {
    await Contribution.deleteMany({});
    await ContributionHistory.deleteMany({});

    res.status(200).json({
      message: "All contributions and contribution histories have been successfully deleted.",
    });
  } catch (error) {
    console.error("Error deleting all contributions and histories:", error);
    res.status(500).json({
      error: "An error occurred while deleting contributions and histories.",
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
        // Check if user is authenticated
        //@ts-ignore
        if (!req.user || !req.user.userId) {
            return res.status(StatusCodes.UNAUTHORIZED).json({
                message: "Unauthorized: User not found.",
            });
        }
        //@ts-ignore
        const userId = req.user.userId;

        // Fetch contributions from the database filtered by user and category
        const contributions = await ContributionHistory.find({
            user: userId,
            savingsCategory: category,
        });

        // Check if contributions exist
        if (!contributions || contributions.length === 0) {
            return res.status(StatusCodes.NOT_FOUND).json({
                message: "No contributions found for this category.",
            });
        }

        // Calculate the total balance from the contributions
        const totalBalance = contributions.reduce((sum, contribution) => {
            return sum + contribution.amount;
        }, 0);

        // Find the contribution with the highest amount
        const highestContribution = contributions.reduce((prev, current) => {
            return (prev.amount > current.amount) ? prev : current;
        });

        const response = {
            statusCode: StatusCodes.OK,
            totalBalance: totalBalance,
            contributions: [
                {
                    contribution: highestContribution._id,
                    user: highestContribution.user,
                    contributionPlan: highestContribution.contributionPlan,
                    savingsCategory: highestContribution.savingsCategory,
                    startDate: highestContribution.startDate,
                    endDate: highestContribution.endDate,
                    status: highestContribution.status,
                    nextContributionDate: highestContribution.nextContributionDate,
                    lastContributionDate: highestContribution.lastContributionDate,
                    //@ts-ignore
                    createdAt: highestContribution.createdAt,
                    //@ts-ignore
                    updatedAt: highestContribution.updatedAt,
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

