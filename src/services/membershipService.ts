import { BadRequestError, ConflictError, NotFoundError } from "../errors";

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

export const updateMembershipStatusService = async (userId: string, membershipType: string) => {
    const membership = await findMembershipService(userId);
    if (!membership) {
        throw new NotFoundError("No membership found for this user.");
    }

    membership.status = "Active"; 
    await membership.save(); 
};
