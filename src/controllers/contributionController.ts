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

    res.status(StatusCodes.OK).json({ totalBalance });
  } catch (error) {
    console.error(error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Error fetching total contribution balance' });
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
    const { page = 1, limit = 5 } = req.query; 

    const allHistory = await ContributionHistory.find({ user: userId });

    // calculate the total balance based on all contributions
    const totalBalance = allHistory.reduce((sum, contribution) => sum + contribution.amount, 0);

    const skip = (Number(page) - 1) * Number(limit);
    const paginatedHistory = await ContributionHistory.find({ user: userId })
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 }); 

    console.log("Contribution history:", paginatedHistory);

    const formattedHistory = paginatedHistory.map((contribution) => ({
      historyEntryId: contribution._id,
      contributionId: contribution.contribution,
      user: contribution.user,
      contributionPlan: contribution.contributionPlan,
      savingsCategory: contribution.savingsCategory,
      amount: contribution.amount,
      startDate: contribution.startDate,
      endDate: contribution.endDate,
      status: contribution.status,
      balance: contribution.totalBalance,
      nextContributionDate: contribution.nextContributionDate,
      lastContributionDate: contribution.lastContributionDate,
      //@ts-ignore
      createdAt: contribution.createdAt,
      //@ts-ignore
      updatedAt: contribution.updatedAt,
    }));

    // Construct the response object
    const response = {
      statusCode: StatusCodes.OK,
      totalBalance,
      contributions: formattedHistory,
      currentPage: Number(page),
      totalPages: Math.ceil(allHistory.length / Number(limit)), 
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


export const getContributionsById = async (req: Request, res: Response) => {
  const { id } = req.params; // Change category to id

  try {
      //@ts-ignore
      if (!req.user || !req.user.userId) {
          return res.status(StatusCodes.UNAUTHORIZED).json({
              message: "Unauthorized: User not found.",
          });
      }
      //@ts-ignore
      const userId = req.user.userId;

      const contribution = await Contribution.findOne({
          user: userId,
          _id: id, 
      });

      if (!contribution) {
          return res.status(StatusCodes.NOT_FOUND).json({
              message: "Contribution not found.",
          });
      }

      const response = {
          statusCode: StatusCodes.OK,
          contribution: {
              _id: contribution._id,
              user: contribution.user,
              contributionPlan: contribution.contributionPlan,
              savingsCategory: contribution.savingsCategory,
              startDate: contribution.startDate,
              endDate: contribution.endDate,
              status: contribution.status,
              balance: contribution.balance,
              nextContributionDate: contribution.nextContributionDate,
              lastContributionDate: contribution.lastContributionDate,
              //@ts-ignore
              createdAt: contribution.createdAt,
              //@ts-ignore
              updatedAt: contribution.updatedAt,
              amount: contribution.amount,
          },
      };

      return res.status(StatusCodes.OK).json(response);
  } catch (error) {
      console.error("Error fetching contribution by ID:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          error: "An unexpected error occurred while fetching the contribution.",
      });
  }
};


