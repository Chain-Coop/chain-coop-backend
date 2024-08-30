import Contribution, { ContributionDocument } from "../models/contribution";
import ContributionHistory from "../models/contributionHistory";

export interface iContribution {
  user: string;
  paymentPlan: string;
  contributionPlan: string;
  amount: number;
  status?: string;
}

export const createContributionService = async (payload: iContribution) => {
  return await Contribution.create(payload);
};

export const updateContributionService = async (id: string, payload: iContribution) => {
  return await Contribution.findOneAndUpdate({ _id: id }, payload, {
    new: true,
    runValidators: true,
  });
};

export const findContributionService = async (payload: any) => {
  return await Contribution.findOne(payload);
};

export const createContributionHistoryService = async (contributionId: string, userId: string, amount: number, status: string) => {
  return await ContributionHistory.create({
    contribution: contributionId,
    user: userId,
    amount,
    status,
  });
};

export const findContributionHistoryService = async (userId: string) => {
  return await ContributionHistory.find({ user: userId }).sort({ createdAt: -1 });
};
