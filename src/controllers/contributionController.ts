import { Request, Response } from "express";
import {
  createContributionService,
  createContributionHistoryService,
  findContributionHistoryService,
  calculateNextContributionDate,
  findContributionService,
} from "../services/contributionService";
import {
  findWalletService,
  updateWalletService,
} from "../services/walletService";
import { BadRequestError } from "../errors";
import { StatusCodes } from "http-status-codes";
import { logUserOperation } from "../middlewares/logging";

export const createContribution = async (req: Request, res: Response) => {
  let userId = null;
  try {
    const { contributionPlan, amount, savingsCategory, frequency, startDate, endDate } = req.body;  // Get savingsCategory and frequency from request
    //@ts-ignore
    userId = req.user.userId;

    // Fetch the user's wallet
    const wallet = await findWalletService({ user: userId });
    if (!wallet) {
      throw new BadRequestError("Wallet not found");
    }

    if (wallet.balance < amount) {
      throw new BadRequestError("Insufficient funds in the wallet");
    }

    // Calculate the next contribution date based on frequency
    const nextContributionDate = calculateNextContributionDate(frequency);

    // Fetch the latest contribution for the user, ignoring status
    const lastContribution = await findContributionService({ user: userId });

    // Calculate the new balance by adding the contribution amount
    const newBalance = (lastContribution?.balance || 0) + amount;

    // Create the contribution with the updated balance, category, and frequency
    const contribution = await createContributionService({
      user: userId,
      contributionPlan,
      savingsCategory, // Save the savings category
      frequency, // Save the contribution frequency
      amount,
      balance: newBalance,
      nextContributionDate,
      lastContributionDate: new Date(),
      status: "Completed",
      startDate,         // Pass start date
      endDate,           // Pass end date
    });

    // Deduct the contribution amount from the wallet
    const updatedWallet = await updateWalletService(wallet._id, {
      balance: wallet.balance - amount,
    });
    if (!updatedWallet) {
      throw new BadRequestError("Failed to update wallet balance");
    }

    // Create a contribution history record
    await createContributionHistoryService(
      //@ts-ignore
      contribution._id.toString(),
      userId,
      contribution.amount,     // Use the amount from the created contribution
      contribution.contributionPlan, // Pass the plan for consistency
      contribution.savingsCategory,  // Pass the category for consistency
      contribution.frequency,   // Pass the frequency for clarity
      "Completed"               // Set the status as "Completed"
    );

   
    await logUserOperation(userId, req, "CREATE_CONTRIBUTION", "Success");
    // Respond with the contribution details, including the status code
    res.status(StatusCodes.CREATED).json({
      statusCode: StatusCodes.CREATED,
      message: "Contribution created successfully",
      contribution: {
        user: contribution.user,
        contributionPlan: contribution.contributionPlan,
        savingsCategory: contribution.savingsCategory,
        frequency: contribution.frequency,
        amount: contribution.amount,
        balance: contribution.balance,
        startDate: contribution.startDate, // Return start date
        endDate: contribution.endDate,     // Return end date
        nextContributionDate: contribution.nextContributionDate,
        lastContributionDate: contribution.lastContributionDate,
        status: contribution.status,
        _id: contribution._id,
        //createdAt: contribution.createdAt,
        //updatedAt: contribution.updatedAt,
        __v: contribution.__v,
      },
      nextContributionDate,
    });
  } catch (error) {
    console.error(error);
    await logUserOperation(userId, req, "CREATE_CONTRIBUTION", "Failure");
    res
      .status(
        error instanceof BadRequestError
          ? StatusCodes.BAD_REQUEST
          : StatusCodes.INTERNAL_SERVER_ERROR
      )
      .json({ 
        statusCode: error instanceof BadRequestError 
          ? StatusCodes.BAD_REQUEST 
          : StatusCodes.INTERNAL_SERVER_ERROR,
          error: (error as Error).message 
      });
  }
};


export const getContributionDetails = async (req: Request, res: Response) => {
  try {
    //@ts-ignore
    const userId = req.user.userId;

    // Fetch the latest contribution to get the current balance and next contribution date
    const contribution = await findContributionService({ user: userId });

    // Check if contribution exists and return the balance and next contribution date
    if (!contribution) {
      // No contributions found, return default values
      return res.status(StatusCodes.OK).json({
        balance: 0,
        nextContributionDate: null,
      });
    }

    // Extract balance and next contribution date
    const { balance, nextContributionDate } = contribution;

    // Return the contribution details
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
  //@ts-ignore
  const userId = req.user.userId;
  const history = await findContributionHistoryService(userId);
  res.status(StatusCodes.OK).json(history);
};

