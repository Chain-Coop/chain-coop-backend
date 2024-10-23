import { ObjectId } from "mongoose";
import Contribution, { ContributionDocument } from "../models/contribution";
import ContributionHistory from "../models/contributionHistory";
import { BadRequestError } from "../errors";
import axios from "axios";
import dotenv from "dotenv";
import { findUser } from "./authService";

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
  
    const existingContribution = await Contribution.findOne({
      user: data.user,
      savingsCategory: data.savingsCategory,
    });

    let categoryBalances = existingContribution?.categoryBalances || {};
    let totalBalance = existingContribution?.balance || 0;

    // Update the category balance for the new contribution
    categoryBalances[data.savingsCategory] = (categoryBalances[data.savingsCategory] || 0) + data.amount;
    totalBalance += data.amount;

    // Create new contribution
    const contribution = await Contribution.create({
      user: data.user,
      contributionPlan: data.contributionPlan,
      amount: data.amount,
      savingsCategory: data.savingsCategory,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      nextContributionDate: new Date(data.startDate),
      lastContributionDate: new Date(),
      categoryBalances, 
      balance: totalBalance,
    });

    const response: any = await axios.post(
      `${PAYSTACK_BASE_URL}/transaction/initialize`,
      {
          email: data.email,
          amount: data.amount * 100, // Convert amount to kobo
          callback_url: `http://localhost:3000/api/v1/contribution/verify-contribution`, 
      },
      {
          headers: {
              Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          },
      }
  );
  
  // Ensure you include the payment link in the return statement
  return {
      contribution: contribution._id,
      user: data.user,
      contributionPlan: contribution.contributionPlan,
      savingsCategory: contribution.savingsCategory,
      amount: contribution.amount,
      SavingsName: contribution.savingsCategory,
      SavingsBalance: totalBalance,
      startDate: contribution.startDate,
      endDate: contribution.endDate,
      status: contribution.status,
      //@ts-ignore
      createdAt: contribution.createdAt,
      //@ts-ignore
      updatedAt: contribution.updatedAt,
      paymentUrl: response.data.data.authorization_url,
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

    const paymentData = response.data.data;

    if (paymentData.status === "success") {
      const { amount, customer } = paymentData;

      const user = await findUser("email", customer.email);
      if (!user) {
        throw new BadRequestError("User not found");
      }

      // Find the contribution associated with the user
      const contribution = await Contribution.findOne({
        user: user._id,
        amount: amount / 100, // Convert amount back to currency
        status: "Pending",
      });

      if (!contribution) {
        throw new BadRequestError("Contribution not found");
      }

      contribution.status = "Completed";
      contribution.balance += amount / 100; // Update total balance

      // Update the specific category balance
      contribution.categoryBalances[contribution.savingsCategory] = 
        (contribution.categoryBalances[contribution.savingsCategory] || 0) + (amount / 100);
      
      await contribution.save();


      //@ts-ignore
      const frequency = contribution.frequency || "Monthly"; 

      // Create contribution history
      await createContributionHistoryService(
        //@ts-ignore
        contribution._id,
        user._id,
        contribution.amount,
        contribution.contributionPlan,
        contribution.savingsCategory,
        frequency, 
        "Completed",
        contribution.startDate,
        contribution.endDate,
        contribution.nextContributionDate || new Date(),
        new Date(), // lastContributionDate
        contribution.balance || 0,
        contribution.categoryBalances || new Map<string, number>()
      );

      // Return the updated contribution details
      return {
        contribution: contribution._id,
        user: user._id,
        contributionPlan: contribution.contributionPlan,
        savingsCategory: contribution.savingsCategory,
        amount: contribution.amount,
        SavingsBalance: contribution.balance || 0,
        startDate: contribution.startDate,
        endDate: contribution.endDate,
        status: contribution.status,
        _id: contribution._id,
        //@ts-ignore
        createdAt: contribution.createdAt,
        //@ts-ignore
        updatedAt: contribution.updatedAt,
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



// Function to process recurring contributions
export const processRecurringContributions = async () => {
  const now = new Date();
  const contributions = await Contribution.find({
    nextContributionDate: { $lte: now },
    status: "Successful", 
  });

  for (const contribution of contributions) {
    const newContributionData = {
      user: contribution.user,
      contributionPlan: contribution.contributionPlan,
      amount: contribution.amount,
      savingsCategory: contribution.savingsCategory,
      startDate: contribution.nextContributionDate,
      endDate: contribution.endDate,
      //@ts-ignore
      frequency: contribution.frequency, 
    };
    //@ts-ignore
    await createContributionService(newContributionData); 
  }
};

export const updateContributionService = async (id: ObjectId, payload: Partial<iContribution>) => {
  const contribution = await Contribution.findById(id);
  if (!contribution) throw new Error('Contribution not found');

  const categoryBalances = contribution.categoryBalances || {};

  if (payload.savingsCategory && payload.amount) {
    // Adjust old category balance
    const oldCategoryBalance = categoryBalances[contribution.savingsCategory] || 0;
    categoryBalances[contribution.savingsCategory] = oldCategoryBalance - contribution.amount;

    // Adjust new category balance
    categoryBalances[payload.savingsCategory] = (categoryBalances[payload.savingsCategory] || 0) + payload.amount;
  }

  const newTotalBalance = Object.values(categoryBalances).reduce((acc, balance) => acc + balance, 0);

  return await Contribution.findByIdAndUpdate(id, {
    ...payload,
    categoryBalances, 
    balance: newTotalBalance,
  }, {
    new: true,
    runValidators: true,
  });
};


export const findContributionService = async ({
  _id,
  user,
}: {
  _id?: ObjectId;
  user?: ObjectId;
}) => {
  return await Contribution.findOne({ user }).sort({ createdAt: -1 });
};

export const createContributionHistoryService = async (
  contributionId: string,
  userId: string,
  amount: number,
  contributionPlan: string,
  savingsCategory: string,
  frequency: string,
  status: string,
  startDate: Date,
  endDate: Date,
  nextContributionDate: Date,
  lastContributionDate: Date,
  totalBalance: number,
  categoryBalances: Record<string, number> 
) => {
  try {
    return await ContributionHistory.create({
      contribution: contributionId,
      user: userId,
      amount,
      contributionPlan,
      savingsCategory,
      frequency,
      status,
      startDate,
      endDate,
      nextContributionDate,
      lastContributionDate,
      totalBalance,
      categoryBalances,
    });
  } catch (error) {
    console.error('Error creating contribution history:', error);
    throw new Error('Failed to create contribution history');
  }
};


export const findContributionHistoryService = async (userId: ObjectId) => {
  return await ContributionHistory.find({ user: userId }).sort({ createdAt: -1 });
};

export const updateContributionBankDetails = async (contributionId: ObjectId, bankDetails: { accountNumber: string, bankCode: string }) => {
  return await Contribution.findByIdAndUpdate(
    contributionId,
    { bankDetails },
    { new: true }
  );
};

export const calculateNextContributionDate = (frequency: string): Date => {
  const date = new Date();
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
