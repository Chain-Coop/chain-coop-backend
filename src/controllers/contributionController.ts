import { Request, Response } from "express";
import {
  createContributionService,
  createContributionHistoryService,
  findContributionHistoryService,
  calculateNextContributionDate,
  findContributionService,
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

export const createContribution = async (req: Request, res: Response) => {
  let userId = null;
  try {
    validateCreateContribution(req);
    const { contributionPlan, amount, savingsCategory, startDate, endDate, pin } = req.body;
    //@ts-ignore
    userId = req.user.userId;

    // Fetch the user's wallet
    const wallet = await findWalletService({ user: userId });
    if (!wallet) {
      throw new BadRequestError("Wallet not found");
    }

    // Validate wallet pin
    const isPinValid = await validateWalletPin(userId, pin);
    if (!isPinValid) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ status: StatusCodes.UNAUTHORIZED, error: "Invalid wallet pin" });
    }

    if (wallet.balance < amount) {
      throw new BadRequestError("Insufficient funds in the wallet");
    }

    // Store the contribution without processing it
    const contribution = await createContributionService({
      user: userId,
      contributionPlan,
      savingsCategory,
      amount,
      balance: 0, // Set balance to 0 initially
      nextContributionDate: calculateNextContributionDate(contributionPlan),
      lastContributionDate: new Date(),
      status: "Pending", // Set contribution status to Pending
      startDate,
      endDate,
    });

    // Respond with the contribution details
    res.status(StatusCodes.CREATED).json({
      statusCode: StatusCodes.CREATED,
      message: "Contribution created successfully",
      contribution: {
        user: contribution.user,
        contributionPlan: contribution.contributionPlan,
        savingsCategory: contribution.savingsCategory,
        amount: contribution.amount,
        balance: contribution.balance, 
        startDate: contribution.startDate,
        endDate: contribution.endDate,
        nextContributionDate: contribution.nextContributionDate,
        lastContributionDate: contribution.lastContributionDate,
        status: contribution.status,
        _id: contribution._id,
        __v: contribution.__v,
      },
    });
  } catch (error) {
    console.error(error);
    res
      .status(
        error instanceof BadRequestError
          ? StatusCodes.BAD_REQUEST
          : StatusCodes.INTERNAL_SERVER_ERROR
      )
      .json({
        statusCode:
          error instanceof BadRequestError
            ? StatusCodes.BAD_REQUEST
            : StatusCodes.INTERNAL_SERVER_ERROR,
        error: (error as Error).message,
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

