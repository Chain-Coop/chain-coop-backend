import { BadRequestError, ConflictError, NotFoundError } from "../errors";
import Membership, { MembershipDocument } from "../models/membership";

// Service to create a new membership
export const createMembershipService = async (payload: any) => {
	return await Membership.create(payload);
};

// Service to update an existing membership by its ID
export const updateMembershipService = async (id: string, payload: any) => {
	return await Membership.findOneAndUpdate({ _id: id }, payload, {
		new: true,
		runValidators: true,
	});
};

// Service to find the most recent membership of a user
export const findMembershipService = async (userId: string) => {
	return await Membership.findOne({ user: userId }).sort({ createdAt: -1 });
};

// Service to update the status of a user's most recent membership to "Active"
export const updateMembershipStatusService = async (
	userId: string,
	membershipType: string
) => {
	// Find the user's most recent membership
	const membership = await findMembershipService(userId);
	if (!membership) {
		throw new NotFoundError("No membership found for this user.");
	}

	// Update the membership status to "Active"
	membership.status = "in-progress";
	membership.membershipType = membershipType;
	await membership.save(); // Save the updated membership
};

// Service to check if a user has an active membership
export const checkActiveMembershipService = async (userId: string) => {
	const membership = await findMembershipService(userId);
	if (membership && membership.status === "Active") {
		throw new ConflictError("User already has an active membership.");
	}
	return membership;
};

// Service to find a membership by its ID
export const findMembershipByIdService = async (id: string) => {
	const membership = await Membership.findById(id);
	if (!membership) {
		throw new NotFoundError("Membership not found.");
	}
	return membership;
};

// Service to verify if a membership exists for a given user and type
export const verifyMembershipExistenceService = async (
	userId: string,
	membershipType: string
) => {
	const membership = await Membership.findOne({ user: userId, membershipType });
	if (membership) {
		throw new ConflictError(
			`User already has a membership of type: ${membershipType}`
		);
	}
	return membership;
};
