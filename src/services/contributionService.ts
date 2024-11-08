import { ObjectId } from "mongoose";
import Contribution, { ContributionDocument } from "../models/contribution";
import ContributionHistory from "../models/contributionHistory";
import { BadRequestError } from "../errors";
import axios from "axios";
import dotenv from "dotenv";
import { findUser } from "./authService";
import { EmailOptions, sendEmail } from "../utils/sendEmail";
import {
  addCardService,
  chargeCardService,
  findWalletService,
} from "./walletService";

dotenv.config();

export interface iContribution {
  endDate: Date | undefined;
  startDate: Date | undefined;
  savingsCategory: string;
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
  nextContributionDate?: Date;
  lastContributionDate?: Date;
}

export interface iContributionHistory {
  contribution: ObjectId;
  user: ObjectId;
  amount: number;
  Date: Date;
  type: string;
  balance: number;
  status: string;
  withdrawalDate?: Date; 
}

const PAYSTACK_BASE_URL = "https://api.paystack.co";
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

export const createContributionService = async (data: {
  user: ObjectId;
  contributionPlan: string;
  amount: number;
  savingsCategory: string;
  startDate: Date;
  endDate: Date;
  email: string;
}) => {
  try {
    // Set nextContributionDate as startDate directly
    const nextContributionDate = new Date(data.startDate);

    // Set withdrawal date to 1 day after endDate
    const withdrawalDate = new Date(data.endDate);
    withdrawalDate.setDate(withdrawalDate.getDate() + 1);

    const contribution = await Contribution.create({
      user: data.user,
      contributionPlan: data.contributionPlan,
      amount: data.amount,
      savingsCategory: data.savingsCategory,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      nextContributionDate,
      lastContributionDate: new Date(), 
      withdrawalDate,
      balance: 0,
      status: "Pending",
    });
    console.log("Created Contribution ID:", contribution._id);

    // Initialize payment on Paystack
    const response: any = await axios.post(
      `${PAYSTACK_BASE_URL}/transaction/initialize`,
      {
        email: data.email,
        amount: data.amount * 100, // Convert amount to kobo
        callback_url: `http://localhost:3000/api/v1/contribution/verify-contribution`,
        metadata: {
          contributionId: contribution._id,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    return {
      paymentUrl: response.data.data.authorization_url,
      reference: response.data.data.reference,
      contributionId: contribution._id,
      withdrawalDate,
    };
  } catch (error: any) {
    console.error("Error creating contribution and initiating payment:", error);
    throw new BadRequestError(
      error.response ? error.response.data : error.message
    );
  }
};


export const verifyContributionPayment = async (reference: string) => {
  try {
    const response: any = await axios.get(
      `${PAYSTACK_BASE_URL}/transaction/verify/${reference}`,
      {
        headers: {  
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`, 
        },
      }
    );
    console.log("Payment verification response:", response.data.data);

    const paymentData = response.data.data;

    if (paymentData.status === "success") {
      const { amount, customer } = paymentData;

      const user = await findUser("email", customer.email);
      if (!user) {
        throw new BadRequestError("User not found");
      }

      await addCardService(user._id as string, {
        number: paymentData.authorization.last4,
        authCode: paymentData.authorization.authorization_code,
      });

      const contribution = await Contribution.findOne({
        _id: paymentData.metadata.contributionId,
        status: "Pending",
      });

      if (!contribution) {
        throw new BadRequestError("Contribution not found");
      }

      contribution.status = "Completed";
      contribution.balance += amount / 100;
      contribution.categoryBalances[contribution.savingsCategory] =
        (contribution.categoryBalances[contribution.savingsCategory] || 0) +
        amount / 100;

      await contribution.save();

      await createContributionHistoryService({
        contribution: contribution._id as ObjectId,
        user: user._id as ObjectId,
        amount: contribution.amount,
        type: "Credit",
        balance: contribution.balance,
        status: "Completed",
        Date: new Date(),
      });

      return {
        message: "Payment verified successfully",
        data: {
          contributionId: contribution._id,
          amount: contribution.amount,
          balance: contribution.balance,
        },
      };
    } else {
      throw new BadRequestError("Payment verification failed");
    }
  } catch (error: any) {
    console.error("Error verifying payment:", error);
    throw new BadRequestError(
      error.response ? error.response.data : error.message
    );
  }
};

export const tryRecurringContributions = async () => {
  const contributions = await Contribution.find({
    status: "Completed",
    endDate: { $gte: new Date() },
    startDate: { $lte: new Date() },
    nextContributionDate: { $lt: new Date() },
  }).populate("user");

  for (let contribution of contributions) {
    const user = contribution.user;
    //@ts-ignore
    const wallet = await findWalletService({ user: user._id });

    if (wallet?.allCards?.length) {
      const Preferred = wallet.allCards.filter((card: any) => card.isPreferred);
      const usableCard = Preferred.length ? Preferred[0] : wallet.allCards[0];
      if (usableCard.failedAttempts && usableCard.failedAttempts >= 3) {
        continue;
      }

      const charge = (await chargeCardService(
        usableCard.authCode,
        //@ts-ignore
        user.email,
        contribution.amount
      )) as {
        data: any;
      };
      //@ts-ignore
      if (charge.data.data.status === "success") {
        contribution.lastContributionDate = new Date();

        contribution.nextContributionDate = calculateNextContributionDate(
          new Date(),
          contribution.contributionPlan
        );

        contribution.balance += contribution.amount;

        //Create contribution history
        await createContributionHistoryService({
          contribution: contribution._id as ObjectId,
          //@ts-ignore
          user: user._id as ObjectId,
          amount: contribution.amount,
          type: "Credit",
          balance: contribution.balance,
          status: "Completed",
          Date: new Date(),
        });

        await contribution.save();
      } else {
        //Increment used card failed count
        usableCard.failedAttempts
          ? usableCard.failedAttempts++
          : (usableCard.failedAttempts = 1);
        wallet.markModified("allCards");

        await wallet.save();
      }
    }
  }
};

export const updateContributionService = async (
  id: ObjectId,
  payload: Partial<iContribution>
) => {
  const contribution = await Contribution.findById(id);
  if (!contribution) throw new Error("Contribution not found");

  const categoryBalances = contribution.categoryBalances || {};

  if (payload.savingsCategory && payload.amount) {
    const oldCategoryBalance =
      categoryBalances[contribution.savingsCategory] || 0;
    categoryBalances[contribution.savingsCategory] =
      oldCategoryBalance - contribution.amount;

    categoryBalances[payload.savingsCategory] =
      (categoryBalances[payload.savingsCategory] || 0) + payload.amount;
  }

  const newTotalBalance = Object.values(categoryBalances).reduce(
    (acc, balance) => acc + balance,
    0
  );

  return await Contribution.findByIdAndUpdate(
    id,
    {
      ...payload,
      categoryBalances,
      balance: newTotalBalance,
    },
    {
      new: true,
      runValidators: true,
    }
  );
};

export const createContributionHistoryService = async (
  payload: iContributionHistory
) => {
  try {

    const contribution = await Contribution.findById(payload.contribution);
    if (!contribution) {
      throw new Error("Contribution not found");
    }

    const contributionHistory = await ContributionHistory.create({
      ...payload,
      withdrawalDate: contribution.withdrawalDate,
    });

    return contributionHistory;
  } catch (error) {
    console.error("Error creating contribution history:", error);
    throw new Error("Failed to create contribution history");
  }
};


export const findContributionHistoryService = async (
  contributionId: string
) => {
  return await ContributionHistory.find({ contribution: contributionId }).sort({
    createdAt: -1,
  });
};

export const updateContributionBankDetails = async (
  contributionId: ObjectId,
  bankDetails: { accountNumber: string; bankCode: string }
) => {
  return await Contribution.findByIdAndUpdate(
    contributionId,
    { bankDetails },
    { new: true }
  );
};

export const calculateNextContributionDate = (
  startDate: Date,
  frequency: string
): Date => {
  const date = new Date(startDate);

  switch (frequency) {
    case "Daily":
      date.setDate(date.getDate() + 1);
      break;
    case "Weekly":
      date.setDate(date.getDate() + 7);
      break;
    case "Monthly":
      date.setMonth(date.getMonth() + 1);
      break;
    default:
      throw new Error(`Invalid contribution frequency: ${frequency}`);
  }

  return date;
};

export const findContributionService = async (payload: any) => {
  return await Contribution.findOne(payload).populate("user");
};

export const getAllUserContributionsService = async (
  userId: ObjectId,
  limit = 0,
  skip = 0
) => {
  return await Contribution.find({ user: userId }).limit(limit).skip(skip);
};

export const getUserContributionsLengthService = async (userId: ObjectId) => {
  return await Contribution.countDocuments({ user: userId });
};

export const getUserContributionStrictFieldsService = async (
  userId: string,
  fields: string[]
) => {
  return await Contribution.find({ user: userId })
    .select(fields.join(" "))
    .lean();
};

export const getContributionHistoryService = async (
  contributionId: string,
  limit: number,
  skip: number
) => {
  return await ContributionHistory.find({ contribution: contributionId })
    .limit(limit)
    .skip(skip);
};

export const getHistoryLengthService = async (contributionId: string) => {
  return await ContributionHistory.countDocuments({
    contribution: contributionId,
  });
};
