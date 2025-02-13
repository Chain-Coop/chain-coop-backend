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
  getPendingContributionsService,
  calculateTotalDebt,
  chargeUnpaidContributions,
  verifyUnpaidContributionPayment,
} from "../services/contributionService";
import {
  chargeCardService,
  createWalletHistoryService,
  findWalletService,
  iWalletHistory,
} from "../services/walletService";
import { BadRequestError, NotFoundError } from "../errors";
import { StatusCodes } from "http-status-codes";
import mongoose, { ObjectId } from "mongoose";
import Contribution from "../models/contribution";
import ContributionHistory from "../models/contributionHistory";
import membership from "../models/membership";
import { findUser } from "../services/authService";

export interface iContribution {
  endDate: any | Date | undefined;
  startDate: any | Date | undefined;
  savingsCategory: any | string;
  _id?: ObjectId;
  user: ObjectId;
  contributionPlan: string;
  savingsType: string,
  amount: number;
  currency: string;
  status?: string;
  bankDetails?: {
    accountNumber: string;
    bankCode: string;
  };
  balance?: number;
  categoryBalances?: Map<string, number>;
  nextContributionDate?: Date;
  lastContributionDate?: Date;
  contributionType?: string; 
}

export const createContribution = async (req: Request, res: Response) => {
  const { amount, currency, contributionPlan, savingsCategory, startDate, endDate, savingsType, contributionType} = req.body;

  //@ts-ignore
  const email = req.user.email;
  //@ts-ignore
  const userId = req.user.userId;

  // Check for required fields
  if (
    !amount ||
    !currency ||
    !email ||
    !contributionPlan ||
    !savingsCategory ||
    !startDate ||
    !endDate  ||
    !savingsType ||
    !contributionType
  ) {
    throw new BadRequestError("All fields are required");
  }

  try {
    const result = await createContributionService({
      amount,
      currency,
      contributionPlan,
      savingsCategory,
      startDate,
      endDate,
      email,
      user: userId,
      savingsType,
      contributionType,
    });

    // Respond with the created contribution data
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

  if (!reference) {
    throw new BadRequestError("Payment reference is required");
  }

  try {
    const result = await verifyContributionPayment(reference);

    res.status(StatusCodes.OK).json({
      statusCode: StatusCodes.OK,
      data: result,
    });
  } catch (error: any) {
    console.error("Error in verifyContribution:", error);

    const statusCode = error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;

    res.status(statusCode).json({
      message: "Failed to verify contribution payment",
      error: error.message,
      statusCode: statusCode,
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

export const getPendingContributions = async (req: Request, res: Response) => {
  try {
    //@ts-ignore
    const userId = req.user.userId;

    const contributions = await getPendingContributionsService(userId);

    res.status(StatusCodes.OK).json({ contributions });
  } catch (error) {
    console.error(error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: "Error fetching pending contributions" });
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
      savingsType: contribution.savingsType,
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
    const { page = "1", limit = "5", contributionId } = req.query;

    if (!contributionId) {
        throw new BadRequestError("Contribution ID is required");
    }

    // Convert to numbers
    const pageNumber = Number(page);
    const limitNumber = Number(limit);

    // Validate that page and limit are numbers
    if (isNaN(pageNumber) || isNaN(limitNumber)) {
        throw new BadRequestError("Page and limit must be numbers");
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
        const {
            balance,
            currency,
            startDate,
            savingsType,
            nextContributionDate,
            withdrawalDate,
            savingsCategory,
            contributionPlan,
            contributionType,
        } = contribution;

        // Fetch the total history length
        const historyLength = await getHistoryLengthService(
            contributionId as string
        );

        const skip = (pageNumber - 1) * limitNumber;

        // Fetch paginated history entries
        const history = await getContributionHistoryService(
            contributionId as string,
            limitNumber,
            skip
        );

        // Calculate total pages for pagination
        const totalPages = Math.ceil(historyLength / limitNumber);

        res.status(StatusCodes.OK).json({
            balance,
            contributionPlan,
            currency,
            savingsCategory,
            savingsType,
            contributionType,
            startDate,
            nextContributionDate,
            withdrawalDate,
            history,
            totalPages,
            currentPage: pageNumber,
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
  const pay = req.body.pay === "active";

  //@ts-ignore
  const contribution = await findContributionService({
    _id: contributionId,
    //@ts-ignore
    user: req.user.userId,
  });

  //@ts-ignore
  const user = await findUser("id", req.user.userId);

  if (!wallet || !contribution || !user) {
    return res.status(StatusCodes.NOT_FOUND).json({
      message: "Wallet or Contribution not found",
      statusCode: StatusCodes.NOT_FOUND,
    });
  }

  if (amount < 100) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      message: "Minimum withdrawal amount is 100 Naira",
      statusCode: StatusCodes.BAD_REQUEST,
    });
  }

  if (!contribution.withdrawalDate) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      message: "Contribution end date is not defined",
      statusCode: StatusCodes.BAD_REQUEST,
    });
  }

  const currentDate = new Date();
  const endDate = new Date(contribution.withdrawalDate);

  // Handle savingsType: Flexible
  if (contribution.savingsType === "Flexible") {
    if (contribution.balance < amount) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "Insufficient funds in contribution balance",
        statusCode: StatusCodes.BAD_REQUEST,
      });
    }
  
    contribution.balance -= amount;
    wallet.balance += amount;
  
    const reference = `REF-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  
    const historyPayload: iWalletHistory = {
      amount: amount,
      label: "Withdrawal from Flexible Contribution",
      type: "credit",
      ref: "Self",
      //@ts-ignore
      user: req.user.userId,
    };
  
    await createWalletHistoryService(historyPayload);
    
    try {
      await createContributionHistoryService({
        contribution: contributionId,
        user: contribution.user,
        amount: amount,
        currency: contribution.currency,
        Date: currentDate,
        type: "debit",
        balance: contribution.balance,
        status: "success",
        reference: reference, // Include unique reference
        withdrawalDate: currentDate,
      });
  
      await contribution.save();
      await wallet.save();
  
      return res.status(StatusCodes.OK).json({
        message: "Withdrawal successful. No penalties applied.",
        amount: amount,
        statusCode: StatusCodes.OK,
      });
    } catch (error) {
      console.error("Error creating contribution history:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: "Failed to create contribution history",
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      });
    }
  }
  
  // Handle savingsType: Strict
  if (contribution.savingsType === "Strict") {
    if (currentDate < endDate) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "You cannot withdraw until the withdrawal date is reached.",
        statusCode: StatusCodes.BAD_REQUEST,
      });
    }

    if (contribution.balance < amount) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "Insufficient funds in contribution balance",
        statusCode: StatusCodes.BAD_REQUEST,
      });
    }

    contribution.balance -= amount;
    wallet.balance += amount;

    const historyPayload: iWalletHistory = {
      amount: amount,
      label: "Withdrawal from Strict Contribution",
      type: "credit",
      ref: "Self",
      //@ts-ignore
      user: req.user.userId,
    };

    await createWalletHistoryService(historyPayload);
    await createContributionHistoryService({
      contribution: contributionId,
      user: contribution.user,
      amount: amount,
      currency: "",
      Date: currentDate,
      type: "debit",
      balance: contribution.balance,
      status: "success",
      withdrawalDate: currentDate,
    });

    await contribution.save();
    await wallet.save();

    return res.status(StatusCodes.OK).json({
      message: "Withdrawal successful. No penalties applied.",
      amount: amount,
      statusCode: StatusCodes.OK,
    });
  }

  // Handle savingsType: Lock (default behavior)
  if (!pay) {
    const debtfee = (await calculateTotalDebt(contributionId)) ? 2000 : 0;
    const membershipFee = user.membershipStatus === "active" ? 0 : 1000;
    const deadline =
      contribution.withdrawalDate && currentDate < endDate ? 2000 : 0;
    const charges = 50;

    const totalPenalties = membershipFee + deadline + charges + debtfee;
    const totalToPay = amount - totalPenalties;

    if (totalToPay <= 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message:
          "The penalties exceed the requested withdrawal amount. Please request a higher amount.",
        statusCode: StatusCodes.BAD_REQUEST,
      });
    }

    return res.status(StatusCodes.OK).json({
      membership: membershipFee,
      deadline: deadline,
      charges: charges,
      totalPenalties: totalPenalties,
      totalToPay: totalToPay,
      debtfee: debtfee,
      statusCode: StatusCodes.OK,
    });
  }

  let penalties = 0;

  if (currentDate < endDate) {
    penalties += 2000; // penalty for early withdrawal
  }

  penalties += 50; // standard withdrawal fee

  if (user.membershipStatus !== "active") {
    penalties += 1000; // membership fee
    user.membershipStatus = "active";
  }

  const totalPenalties = penalties;
  const totalToPay = amount - totalPenalties;

  if (totalToPay <= 0) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      message:
        "The penalties exceed the requested withdrawal amount. Please request a higher amount.",
      statusCode: StatusCodes.BAD_REQUEST,
    });
  }

  if (contribution.balance < amount) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      message: "Insufficient funds in contribution balance",
      statusCode: StatusCodes.BAD_REQUEST,
    });
  }

  contribution.balance -= amount;
  wallet.balance += totalToPay;

  const historyPayload: iWalletHistory = {
    amount: totalToPay,
    label: "Withdrawal from Lock Contribution",
    type: "credit",
    ref: "Self",
    //@ts-ignore
    user: req.user.userId,
  };

  await createWalletHistoryService(historyPayload);
  await createContributionHistoryService({
    contribution: contributionId,
    user: contribution.user,
    amount: amount,
    currency: "",
    Date: new Date(),
    type: "debit",
    balance: contribution.balance,
    status: "success",
    withdrawalDate: currentDate,
  });

  await contribution.save();
  await wallet.save();
  await user.save();

  res.status(StatusCodes.OK).json({
    message:
      "Transfer successful. Penalties have been deducted. Proceed to your wallet to complete the withdrawal process.",
    totalPenalties: totalPenalties,
    totalToPay: totalToPay,
    statusCode: StatusCodes.OK,
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
  if (charge.data.status !== "success") {
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
    currency: contribution.currency,
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
    const { page = 1, limit = 5, sort = "desc" } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const conLength = await getUserContributionsLengthService(userId);

    // Fetch contributions and await the result
    let contributions = await getAllUserContributionsService(
      userId,
      Number(limit),
      skip
    );

    // Sort after fetching if necessary
    const sortOrder = sort === "asc" ? 1 : -1;
    contributions = contributions.sort((a: any, b: any) =>
      sortOrder === 1 ? a.createdAt - b.createdAt : b.createdAt - a.createdAt
    );

    const totalPages = Math.ceil(conLength / Number(limit));

    res.status(StatusCodes.OK).json({
      contributions: contributions,
      totalPages,
      currentPage: page,
    });
  } catch (error) {
    console.error("Error fetching user contributions:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Error fetching user contributions",
    });
  }
};

export const getUnpaidContributions = async (req: Request, res: Response) => {
  const { contributionId } = req.query;

  if (!contributionId) {
    throw new BadRequestError("Contribution ID is required");
  }

  const totalAmount = await calculateTotalDebt(contributionId as string);
  console.log("Total amount:", totalAmount);

  res.status(StatusCodes.OK).json({ totalAmount });
};

export const chargeforUnpaidContributions = async (
  req: Request,
  res: Response
) => {
  const { contributionId, cardData, paymentType } = req.body;
  if (!contributionId) {
    throw new BadRequestError("Contribution ID is required");
  }

  const charge = await chargeUnpaidContributions(
    contributionId,
    paymentType,
    cardData
  );

  res.status(StatusCodes.OK).json({ charge });
};

export const verifyUnpaidPayment = async (req: Request, res: Response) => {
  const { reference } = req.query;

  if (!reference || typeof reference !== "string") {
    throw new BadRequestError("Payment reference is required");
  }

  const result = await verifyUnpaidContributionPayment(reference);

  res.status(StatusCodes.OK).json({ result });
};