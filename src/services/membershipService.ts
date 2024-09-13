import Membership, { MembershipDocument } from "../models/membership";

export const createMembershipService = async (payload: any) => {
  return await Membership.create(payload);
};

export const updateMembershipService = async (id: string, payload: any) => {
  return await Membership.findOneAndUpdate({ _id: id }, payload, {
    new: true,
    runValidators: true,
  });
};

export const findMembershipService = async (userId: string) => {
  return await Membership.findOne({ user: userId }).sort({ createdAt: -1 });
};
