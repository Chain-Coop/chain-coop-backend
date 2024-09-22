import { ObjectId } from "mongoose";
import Contribution, { ContributionDocument } from "../models/contribution";
import ContributionHistory from "../models/contributionHistory";

export interface iContribution {
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
  return await Contribution.create(payload);
};

export const updateContributionService = async (id: ObjectId, payload: Partial<iContribution>) => {
  return await Contribution.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });
};

export const findContributionService = async ({ _id, user }: { _id?: ObjectId; user?: ObjectId }) => {
  return Contribution.findOne({ _id, user });
};

export const createContributionHistoryService = async (contributionId: ObjectId, userId: ObjectId, amount: number, status: string) => {
  return await ContributionHistory.create({
    contribution: contributionId,
    user: userId,
    amount,
    status,
  });
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

export const calculateNextContributionDate = (plan: string): Date => {
  const date = new Date();
  switch (plan) {
    case "Daily":
      date.setDate(date.getDate() + 1);
      break;
    case "Weekly":
      date.setDate(date.getDate() + 7);
      break;
    case "Monthly":
      date.setMonth(date.getMonth() + 1);
      break;
    case "Yearly":
      date.setFullYear(date.getFullYear() + 1);
      break;
    default:
      throw new Error(`Invalid contribution plan: ${plan}`);
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
      });

      await updateContributionService(contribution._id as ObjectId, {
        lastContributionDate: new Date(),
        nextContributionDate: calculateNextContributionDate(contribution.contributionPlan),
      });
    }
  }
};
