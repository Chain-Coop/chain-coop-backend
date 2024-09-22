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
