import { ObjectId } from "mongoose";
import Contribution, { ContributionDocument } from "../models/contribution";
import ContributionHistory from "../models/contributionHistory";

export interface iContribution {
  endDate: any | Date | undefined;
  startDate: any | Date | undefined;
  frequency: any | string;
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
  nextContributionDate?: Date;
  lastContributionDate?: Date;
}

export const createContributionService = async (payload: iContribution) => {
  const lastContribution = await findContributionService({ user: payload.user });
  const newBalance = (lastContribution?.balance || 0) + payload.amount;

  return await Contribution.create({
    ...payload,
    balance: newBalance,
    savingsCategory: payload.savingsCategory, 
    contributionPlan: payload.contributionPlan, 
    startDate: payload.startDate,
    endDate: payload.endDate,
  });
};


export const updateContributionService = async (id: ObjectId, payload: Partial<iContribution>) => {
  return await Contribution.findByIdAndUpdate(id, payload, {
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
  // Fetch the most recent contribution for the user without filtering by status
  return await Contribution.findOne({ user }).sort({ createdAt: -1 });
};

// contributionService.ts
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
  lastContributionDate: Date   
) => {
  try {
    // Create the contribution history entry
    return await ContributionHistory.create({
      contribution: contributionId,
      user: userId,
      amount: amount,
      contributionPlan: contributionPlan,
      savingsCategory: savingsCategory,
      frequency: frequency,
      status: status,
      startDate: startDate,      
      endDate: endDate, 
      nextContributionDate: nextContributionDate,  
      lastContributionDate: lastContributionDate  
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


// new function to process recurring contributions
export const processRecurringContributions = async () => {
  const contributions = await Contribution.find({ status: "Pending" });

  for (const contribution of contributions) {
    const { nextContributionDate, lastContributionDate, amount, user } = contribution;

    if (nextContributionDate && nextContributionDate <= new Date()) {
      // Create a new contribution for this user
      await createContributionService({
        user,
        contributionPlan: contribution.contributionPlan,
        amount,
        nextContributionDate: calculateNextContributionDate(contribution.contributionPlan),
        lastContributionDate: new Date(),
        frequency: undefined,
        savingsCategory: undefined,
        endDate: undefined,
        startDate: undefined
      });

      await updateContributionService(contribution._id as ObjectId, {
        lastContributionDate: new Date(),
        nextContributionDate: calculateNextContributionDate(contribution.contributionPlan),
      });
    }
  }
};