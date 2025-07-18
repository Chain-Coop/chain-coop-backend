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
  validateWalletPin,
} from "../services/walletService";
import { BadRequestError, NotFoundError } from "../errors";
import { StatusCodes } from "http-status-codes";
import mongoose, { ObjectId } from "mongoose";
import Contribution from "../models/contribution";
import ContributionHistory from "../models/contributionHistory";
import membership from "../models/membership";
import { findUser } from "../services/authService";
import bcrypt from "bcryptjs";

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
  savingsDuration?: number;
}



export const createContribution = async (req: Request, res: Response) => {
  const { amount, currency, contributionPlan, savingsCategory, startDate, endDate, savingsType, contributionType } = req.body;

  //@ts-ignore
  const email = req.user.email;
  //@ts-ignore
  const userId = req.user.userId;

  if (
    !amount ||
    !currency ||
    !email ||
    !savingsCategory ||
    !startDate ||
    !endDate ||
    !contributionType
  ) {
    throw new BadRequestError("All fields are required");
  }

  const objectId = new mongoose.Types.ObjectId(userId);

  // Paystack fee calculation (Nigerian rates)
  const calculatePaystackFee = (amt: number): number => {
    let fee = amt * 0.015;
    if (amt >= 2500) {
      fee += 100;
    }
    return Math.min(fee, 2000);
  };

  const paystackFee = calculatePaystackFee(amount);
  const totalAmountToPay = amount + paystackFee;

  try {
    const result = await createContributionService({
      amount: totalAmountToPay,
      currency,
      contributionPlan,
      savingsCategory,
      startDate,
      endDate,
      email,
      user: objectId,
      savingsType,
      contributionType,
    });

    // Append fee info to the response
    res.status(StatusCodes.OK).json({
      result: {
        ...result,
        paymentInfo: {
          baseAmount: amount,
          paystackFee,
          totalAmountToPay,
          note: "This includes Paystack processing fees"
        }
      }
    });
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
    const { contributionId } = req.query;

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
        const {
            balance,
            currency,
            startDate,
            endDate,
            savingsType,
            nextContributionDate,
            withdrawalDate,
            savingsCategory,
            contributionPlan,
            contributionType,
        } = contribution;

        // Fetch full history  
        const history = await getContributionHistoryService(
            contributionId as string
        );

        res.status(StatusCodes.OK).json({
            balance,
            contributionPlan,
            currency,
            savingsCategory,
            savingsType,
            contributionType,
            startDate,
            endDate,
            nextContributionDate,
            withdrawalDate,
            history,
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
  const userId = req.user.userId;
  const { amount, contributionId} = req.body;
  const pay = req.body.pay === "active";
  const pin = String(req.body.pin);

  if (!pin) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      message: "Wallet pin is required for this transaction.",
      statusCode: StatusCodes.BAD_REQUEST,
    });
  }

  const wallet = await findWalletService({ user: userId });
  const contribution = await findContributionService({
    _id: contributionId,
    user: userId,
  });
  const user = await findUser("id", userId);

  if (!wallet || !contribution || !user) {
    return res.status(StatusCodes.NOT_FOUND).json({
      message: "Wallet or Contribution not found",
      statusCode: StatusCodes.NOT_FOUND,
    });
  }

  // Check if user has set a PIN
  if (!wallet.isPinCreated) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      message: "You have not set a wallet pin.",
      statusCode: StatusCodes.BAD_REQUEST,
    });
  }

  // Validate the pin
  const isPinValid = await validateWalletPin(userId, pin);
  if (!isPinValid) {
    return res.status(StatusCodes.UNAUTHORIZED).json({
      message: "Invalid wallet pin.",
      statusCode: StatusCodes.UNAUTHORIZED,
    });
  }


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
  const reference = `REF-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

// Handle savingsType: Flexible
if (contribution.savingsType === "Flexible") {
  const withdrawalFee = 50;
  const membershipFee = user.membershipStatus === "active" ? 0 : 1000;

  const totalFees = withdrawalFee + membershipFee;
  const totalToCredit = Math.max(amount - totalFees, 0);

  if (totalToCredit <= 0) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      message: "The total fees exceed the withdrawal amount. Please request a higher amount.",
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
  wallet.balance += totalToCredit;

  // Update membership status if needed
  if (user.membershipStatus !== "active") {
    user.membershipStatus = "active";
    await user.save();
  }

  const historyPayload: iWalletHistory = {
    amount: totalToCredit,
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
      amount: totalToCredit,
      currency: contribution.currency,
      Date: currentDate,
      type: "debit",
      balance: contribution.balance,
      status: "success",
      reference: reference,
      withdrawalDate: currentDate,
      savingsType: contribution.savingsType,
    });

    await contribution.save();
    await wallet.save();

    return res.status(StatusCodes.OK).json({
      message: "Withdrawal successful. 3% and membership fees applied.",
      amount: totalToCredit,
      withdrawalFee,
      membershipFee,
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

  
// Handle savingsType: Lock
if (contribution.savingsType === "Lock") {
  const withdrawalFee = 50;
  const earlyWithdrawalPenalty = currentDate < endDate ? Math.floor(amount * 0.03) : 0; // 3% penalty
  const membershipFee = user.membershipStatus === "active" ? 0 : 1000;

  const totalDeductions = withdrawalFee + earlyWithdrawalPenalty + membershipFee;
  const totalToCredit = Math.max(amount - totalDeductions, 0);

  if (contribution.balance < amount) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      message: "Insufficient funds in contribution balance",
      statusCode: StatusCodes.BAD_REQUEST,
    });
  }

  if (totalToCredit <= 0) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      message: "The deductions exceed or equal the withdrawal amount. Please request a higher amount.",
      statusCode: StatusCodes.BAD_REQUEST,
    });
  }

  contribution.balance -= amount;
  wallet.balance += totalToCredit;

  if (user.membershipStatus !== "active") {
    user.membershipStatus = "active";
    await user.save();
  }

  const historyPayload: iWalletHistory = {
    amount: totalToCredit,
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
    currency: contribution.currency || "",
    Date: currentDate,
    type: "debit",
    balance: contribution.balance,
    status: "success",
    reference: reference,
    withdrawalDate: currentDate,
    savingsType: contribution.savingsType,
  });

  await contribution.save();
  await wallet.save();

  return res.status(StatusCodes.OK).json({
    message: "Withdrawal successful. Deductions have been applied.",
    amountWithdrawn: totalToCredit,
    withdrawalFee: withdrawalFee,
    membershipFee: membershipFee,
    statusCode: StatusCodes.OK,
  });
}


// Handle savingsType: Strict  
if (contribution.savingsType === "Strict") {
  const withdrawalFee = 50; // fixed withdrawal fee
  const earlyWithdrawalPenalty = currentDate < endDate ? Math.floor(amount * 0.03) : 0; // 3% early withdrawal
  const membershipFee = user.membershipStatus === "active" ? 0 : 1000;
  const debtFee = (await calculateTotalDebt(contributionId)) ? 2000 : 0;

  const totalPenalties = withdrawalFee + earlyWithdrawalPenalty + membershipFee + debtFee;
  const totalToPay = Math.max(amount - totalPenalties, 0);

  // Preview penalties only
  if (!pay) {
    if (totalToPay <= 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "The penalties exceed the requested withdrawal amount. Please request a higher amount.",
        statusCode: StatusCodes.BAD_REQUEST,
      });
    }

    return res.status(StatusCodes.OK).json({
      membershipFee,
      earlyWithdrawalPenalty,
      withdrawalFee,
      debtFee,
      totalPenalties,
      totalToPay,
      statusCode: StatusCodes.OK,
    });
  }

  // Proceed with actual withdrawal
  if (contribution.balance < amount) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      message: "Insufficient funds in contribution balance",
      statusCode: StatusCodes.BAD_REQUEST,
    });
  }

  if (totalToPay <= 0) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      message: "The penalties exceed the requested withdrawal amount. Please request a higher amount.",
      statusCode: StatusCodes.BAD_REQUEST,
    });
  }

  contribution.balance -= amount;
  wallet.balance += totalToPay;

  if (user.membershipStatus !== "active") {
    user.membershipStatus = "active";
    await user.save();
  }

  const historyPayload: iWalletHistory = {
    amount: totalToPay,
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
    currency: contribution.currency || "",
    Date: currentDate,
    type: "debit",
    balance: contribution.balance,
    status: "success",
    reference: reference,
    withdrawalDate: currentDate,
    savingsType: contribution.savingsType,
  });

  await contribution.save();
  await wallet.save();

  return res.status(StatusCodes.OK).json({
    message:
      totalToPay > 0
        ? "Transfer successful. Penalties have been deducted."
        : "Penalties have fully consumed the withdrawal amount. No funds were added to your wallet.",
    totalPenalties,
    totalToPay,
    statusCode: StatusCodes.OK,
  });
}



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
    contribution.amount,
    { contributionId }
  );

  //@ts-ignore
  if (charge.data.status !== "success") {
    return res.status(StatusCodes.BAD_REQUEST).json({
      statusCode: StatusCodes.BAD_REQUEST,
      message: "Payment verification failed.",
    });
  }

  contribution.lastContributionDate = new Date();
    // Update status to "Completed" as the payment was successful
    contribution.status = "Completed";
  contribution.nextContributionDate = calculateNextContributionDate(
    new Date(),
    contribution.contributionPlan!
  );
  contribution.balance += contribution.amount;
  const reference = `REF-${Date.now()}-${Math.floor(Math.random() * 10000)}`; 

  await createContributionHistoryService({
    contribution: contributionId,
    user: contribution.user,
    amount: contribution.amount,
    currency: contribution.currency,
    Date: new Date(),
    type: "credit",
    balance: contribution.balance,
    status: "success",
    savingsType: contribution.savingsType,
    reference: reference,
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
    const { sort = "desc", search = "", filter } = req.query;

    const sortOrder = sort === "asc" ? 1 : -1;

    const query: any = {
      user: userId,
      status: { $ne: "Pending" },
    };

    // Apply savingsType filter if valid
    const allowedFilters = ["Lock", "Strict", "Flexible", "One-time"];
    if (filter) {
      const normalizedFilter = String(filter).charAt(0).toUpperCase() + String(filter).slice(1).toLowerCase();
      if (allowedFilters.includes(normalizedFilter)) {
        query.savingsType = normalizedFilter;
      }
    }

    // Apply search term if present
    if (search) {
      query.savingsCategory = { $regex: new RegExp(String(search), "i") };
    }

    const contributions = await Contribution.find(query)
      .sort({ createdAt: sortOrder });

    res.status(StatusCodes.OK).json({
      contributions,
      total: contributions.length,
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
