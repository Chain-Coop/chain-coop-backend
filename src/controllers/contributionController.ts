import { Request, Response } from "express";
import {
  createContributionService,
  createContributionHistoryService,
  calculateNextContributionDate,
  verifyContributionPayment,
  findContributionService,
  getAllUserContributionsService,
  findContributionHistoryService,
  getUserContributionStrictFieldsService,
  getHistoryLengthService,
  getContributionHistoryService,
  getUserContributionsLengthService,
  initializeContributionPayment,
} from "../services/contributionService";
import {
  chargeCardService,
  createWalletHistoryService,
  findWalletService,
  iWalletHistory,
} from "../services/walletService";
import { BadRequestError, NotFoundError } from "../errors";
import { StatusCodes } from "http-status-codes";
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
  const {
    amount,
    contributionPlan,
    savingsCategory,
    startDate,
    endDate,
    paymentType,
    cardData,
  } = req.body;
  //@ts-ignore
  const email = req.user.email;
  //@ts-ignore
  const userId = req.user.userId;

  if (
    !amount ||
    !email ||
    !contributionPlan ||
    !savingsCategory ||
    !startDate ||
    !endDate
  ) {
    throw new BadRequestError("All fields are required");
  }

  try {
    const result = (await createContributionService({
      amount,
      contributionPlan,
      savingsCategory,
      startDate,
      endDate,
      email,
      user: userId,
    })) as Object;

    res.status(StatusCodes.OK).json({ result });
  } catch (error: any) {
    console.error("Error in createContribution:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Failed to create contribution and initiate payment",
      error: error.message,
    });
  }
};

export const attemptPayment = async (req: Request, res: Response) => {
  //@ts-ignore
  const userId = req.user.userId;
  const { contributionId, paymentType, cardData } = req.body;

  const payment = await initializeContributionPayment(
    contributionId,
    paymentType,
    userId,
    cardData
  );

  res.status(StatusCodes.OK).json({ payment });
};

export const verifyContribution = async (req: Request, res: Response) => {
  const reference = req.query.reference as string;
  const isAddCard = req.query.addCard === "true";

  if (!reference) {
    throw new BadRequestError("Payment reference is required");
  }

  try {
    await verifyContributionPayment(reference, isAddCard);
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

export const getTotalBalance = async (req: Request, res: Response) => {
  try {
    //@ts-ignore
    const userId = req.user.userId;

    const contributions = await getUserContributionStrictFieldsService(userId, [
      "balance",
    ]);

    const totalBalance = contributions.reduce(
      (sum, contribution) => sum + (contribution.balance as number),
      0
    );

    res.status(StatusCodes.OK).json({ totalBalance });
  } catch (error) {
    console.error(error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: "Error fetching total contribution balance" });
  }
};

export const deleteAllContributions = async (req: Request, res: Response) => {
  try {
    await Contribution.deleteMany({});
    await ContributionHistory.deleteMany({});

    res.status(200).json({
      message:
        "All contributions and contribution histories have been successfully deleted.",
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
    const { page = 1, limit = 5, contributionId } = req.query;

    if (!contributionId) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "Contribution ID is required.",
      });
    }

    const allHistory = await findContributionHistoryService(
      contributionId as string
    );

    // calculate the total balance based on all contributions
    const totalBalance = allHistory.reduce(
      (sum, contribution) => sum + contribution.amount,
      0
    );

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
      amount: contribution.amount,
      Date: contribution.Date,
      type: contribution.type,
      balance: contribution.balance,
      status: contribution.status,
    }));

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
      error:
        "An unexpected error occurred while fetching contribution history.",
    });
  }
};

export const newgetContributionHistory = async (
  req: Request,
  res: Response
) => {
  const { page = 1, limit = 5, contributionId } = req.query;

  if (!contributionId) {
    throw new BadRequestError("Contribution ID is required");
  }

  try {
    // Get contribution details using contributionId
    const contribution = await findContributionService({
      _id: contributionId as string,
    });
    if (!contribution) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: "Contribution not found",
      });
    }

    // Get the overall balance, next contribution date, and withdrawal date from the contribution
    const { balance, startDate, nextContributionDate, withdrawalDate } =
      contribution;

    // Fetch the total history length and validate limit type
    const historyLength = await getHistoryLengthService(
      contributionId as string
    );
    if (typeof limit !== "number") {
      throw new BadRequestError("Limit must be a number");
    }
    const skip = (Number(page) - 1) * limit;

    // Fetch paginated history entries
    const history = await getContributionHistoryService(
      contributionId as string,
      limit,
      skip
    );

    // Calculate total pages for pagination
    const totalPages = Math.ceil(historyLength / limit);

    res.status(StatusCodes.OK).json({
      balance,
      startDate,
      nextContributionDate,
      withdrawalDate,
      history,
      totalPages,
      currentPage: page,
    });
  } catch (error) {
    console.error("Error fetching contribution history:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error:
        "An unexpected error occurred while fetching contribution history.",
    });
  }
};

export const withdrawContribution = async (req: Request, res: Response) => {
  //@ts-ignore
  const wallet = await findWalletService({ user: req.user.userId });
  const { amount, contributionId } = req.body;
  //@ts-ignore
  const contribution = await findContributionService({ _id: contributionId });

  if (!wallet || !contribution) {
    throw new NotFoundError("Wallet or Contribution not found");
  }

  if (amount < 2000) {
    throw new BadRequestError("Minimum withdrawal amount is 2000 Naira");
  }

  if (!contribution.withdrawalDate) {
    throw new BadRequestError("Contribution end date is not defined");
  }

  const currentDate = new Date();
  const endDate = new Date(contribution.withdrawalDate);

  let totalAmountToWithdraw = amount;

  if (currentDate < endDate) {
    totalAmountToWithdraw += 2000;
  }

  if (contribution.balance < totalAmountToWithdraw) {
    throw new BadRequestError("Insufficient funds in contribution balance");
  }

  totalAmountToWithdraw += 50;

  const hasWithdrawnBefore = contribution.balance > 0;
  if (!hasWithdrawnBefore) {
    totalAmountToWithdraw += 1000;
  }

  contribution.balance -= totalAmountToWithdraw;
  wallet.balance += amount;

  const historyPayload: iWalletHistory = {
    amount,
    label: "Withdrawal from Contribution",
    type: "credit",
    ref: "Self",
    //@ts-ignore
    user: req.user.userId,
  };

  await createWalletHistoryService(historyPayload);
  await createContributionHistoryService({
    contribution: contributionId,
    user: contribution.user,
    amount: totalAmountToWithdraw,
    Date: new Date(),
    type: "debit",
    balance: contribution.balance,
    status: "success",
    withdrawalDate: currentDate,
  });

  await contribution.save();
  await wallet.save();

  res.status(StatusCodes.OK).json({
    message:
      "Transfer successful. Proceed to your wallet to complete the withdrawal process.",
  });
};

export const getContributionsById = async (req: Request, res: Response) => {
  const { id } = req.params;

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
      contribution: contribution,
    };

    return res.status(StatusCodes.OK).json(response);
  } catch (error) {
    console.error("Error fetching contribution by ID:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: "An unexpected error occurred while fetching the contribution.",
    });
  }
};

export const chargeCardforContribution = async (
  req: Request,
  res: Response
) => {
  const { contributionId, cardAuthCode } = req.body;

  if (!contributionId || !cardAuthCode) {
    throw new BadRequestError(
      "Contribution and card authorization code are required"
    );
  }

  const contribution = await findContributionService({ _id: contributionId });
  if (!contribution) {
    throw new NotFoundError("Contribution not found");
  }

  const charge = await chargeCardService(
    cardAuthCode,
    //@ts-ignore
    contribution.user.email,
    contribution.amount
  );

  //@ts-ignore
  if (charge.data.data.status !== "success") {
    return res.status(StatusCodes.BAD_REQUEST).json({
      statusCode: StatusCodes.BAD_REQUEST,
      message: "Payment verification failed.",
    });
  }

  contribution.lastContributionDate = new Date();
  contribution.nextContributionDate = calculateNextContributionDate(
    new Date(),
    contribution.contributionPlan
  );
  contribution.balance += contribution.amount;

  await createContributionHistoryService({
    contribution: contributionId,
    user: contribution.user,
    amount: contribution.amount,
    Date: new Date(),
    type: "credit",
    balance: contribution.balance,
    status: "success",
  });

  await contribution.save();

  res.status(StatusCodes.OK).json({
    statusCode: StatusCodes.OK,
    message: "Payment successful. Contribution has been made.",
  });
};
export const getUserContributions = async (req: Request, res: Response) => {
  try {
    //@ts-ignore
    const userId = req.user.userId;
    const { page = 1, limit = 5 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const conLength = await getUserContributionsLengthService(userId);

    const contributions = await getAllUserContributionsService(
      userId,
      Number(limit),
      skip
    );

    const totalPages = Math.ceil(conLength / Number(limit));

    res
      .status(StatusCodes.OK)
      .json({ contributions: contributions, totalPages, currentPage: page });
  } catch (error) {
    console.error("Error fetching user contributions:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: "Error fetching user contributions" });
  }
};
