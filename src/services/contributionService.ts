import { ObjectId } from "mongoose";
import Contribution, { ContributionDocument } from "../models/contribution";
import ContributionHistory from "../models/contributionHistory";
import { BadRequestError } from "../errors";
import axios from "axios";
import dotenv from "dotenv";
import { findUser } from "./authService";
import { EmailOptions, sendEmail } from "../utils/sendEmail"

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


    const nextContributionDate = calculateNextContributionDate(data.startDate, data.contributionPlan);

    const contribution = await Contribution.create({
      user: data.user,
      contributionPlan: data.contributionPlan,
      amount: data.amount,
      savingsCategory: data.savingsCategory,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      nextContributionDate,
      lastContributionDate: new Date(data.endDate),
      balance: 0,
      status: "Pending", 
    });

    console.log("Created Contribution ID:", contribution._id);

    // Initialize the payment
    const response: any = await axios.post(
      `${PAYSTACK_BASE_URL}/transaction/initialize`,
      {
        email: data.email,
        amount: data.amount * 100, // Amount in kobo
        callback_url: `http://localhost:3000/api/v1/contribution/verify-contribution`,
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    return {
      paymentUrl: response.data.data.authorization_url,
      reference: response.data.data.reference,
      contributionId: contribution._id, 
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

      const contribution = await Contribution.findOne({
        user: user._id,
        amount: amount / 100,
        status: "Pending",
      });

      if (!contribution) {
        throw new BadRequestError("Contribution not found");
      }

      const existingHistory = await ContributionHistory.findOne({
        contribution: contribution._id,
        user: user._id,
        status: "Completed", 
      });

      if (existingHistory) {
        throw new BadRequestError("Contribution history already exists for this payment");
      }

      contribution.status = "Completed";
      contribution.balance += amount / 100;
      contribution.categoryBalances[contribution.savingsCategory] = 
        (contribution.categoryBalances[contribution.savingsCategory] || 0) + (amount / 100);
      
      await contribution.save();

      await createContributionHistoryService(
        //@ts-ignore
        contribution._id,  
        user._id,  
        contribution.amount,  
        contribution.contributionPlan,  
        contribution.savingsCategory,  
        contribution.contributionPlan,  
        "Completed",  
        contribution.startDate,
        contribution.endDate,   
        contribution.nextContributionDate || new Date(), 
        contribution.endDate || new Date(),  
        contribution.balance || 0,  
        contribution.categoryBalances || {} 
      ); 

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
        nextContributionDate: contribution.nextContributionDate,
        lastContributionDate: contribution.endDate,
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

export const processRecurringContributions = async () => {
  const now = new Date();

  // Find contributions due for processing
  const contributions = await Contribution.find({
    nextContributionDate: { $lte: now },
    status: "Successful",
  });

  for (const contribution of contributions) {
    const user = await findUser("_id", contribution.user.toString());
    if (!user) {
      console.error(`User not found for contribution: ${contribution._id}`);
      continue;
    }

    try {
      // Initialize payment for the recurring contribution
      const response: any = await axios.post(
        `${PAYSTACK_BASE_URL}/transaction/initialize`,
        {
          email: user.email,
          amount: contribution.amount * 100, // Convert to kobo
          callback_url: `http://localhost:5173/dashboard/contribution/fund_contribution/verify_transaction`, // Adjust callback URL if needed
        },
        {
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          },
        }
      );

      // No email reminder is sent, but you may still want to log or perform other actions.

      // Calculate the new next contribution date based on the contribution plan
      const newNextContributionDate = calculateNextContributionDate(
        contribution.nextContributionDate || new Date(),
        contribution.contributionPlan
      );

      // Update contribution's dates
      contribution.nextContributionDate = newNextContributionDate;
      contribution.lastContributionDate = now;
      await contribution.save();

      console.log(`Processed recurring contribution for user ${user.email}. Next due date: ${newNextContributionDate}`);

    } catch (error) {
      console.error(`Failed to process contribution for user ${user.email}:`, error);
    }
  }
};



export const updateContributionService = async (id: ObjectId, payload: Partial<iContribution>) => {
  const contribution = await Contribution.findById(id);
  if (!contribution) throw new Error('Contribution not found');

  const categoryBalances = contribution.categoryBalances || {};

  if (payload.savingsCategory && payload.amount) {

    const oldCategoryBalance = categoryBalances[contribution.savingsCategory] || 0;
    categoryBalances[contribution.savingsCategory] = oldCategoryBalance - contribution.amount;

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
    const contributionHistory = await ContributionHistory.create({
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
    
    return {
      contributionHistory,
      nextContributionDate,
      lastContributionDate,
    };
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

export const calculateNextContributionDate = (startDate: Date, frequency: string): Date => {
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