import { request, Request, Response } from "express";
import {
	createMembershipService,
	findMembershipService,
} from "../services/membershipService";
import {
	findWalletService,
	updateWalletService,
} from "../services/walletService";
import { BadRequestError, ConflictError, NotFoundError } from "../errors";
import { StatusCodes } from "http-status-codes";
import uploadImageFile from "../utils/imageUploader";
import {
	createPaystackSubscription,
	getPlanIdForMembershipType,
} from "../services/paystackService";
import { Schema } from "mongoose";

// membership amounts for each type(with temp amounts, will update after they are announced)
const membershipAmounts: Record<string, number> = {
	Explorer: 50000,
	Pioneer: 10000,
	Voyager: 250000,
};

// interface MembershipProps {
// 	amount: number;
// 	name_of_plan: string;
// 	descruption: string;
// 	subscribed_users: Schema.Types.ObjectId[];
// 	// ...
// }

export const activateMembership = async (req: Request, res: Response) => {
	const { membershipType, paymentMethod } = req.body;
	//@ts-ignore
	const userId = req.user.userId;

	// Validate membership type
	if (!membershipType || !membershipAmounts[membershipType]) {
		throw new BadRequestError("Invalid membership type.");
	}

	const amount = membershipAmounts[membershipType];

	// Check if the user already has an active membership
	const existingMembership = await findMembershipService(userId);
	if (existingMembership && existingMembership.status === "Active") {
		throw new ConflictError("You already have an active membership.");
	}

	let bankReceiptUrl = null;
	let subscriptionUrl = null;

	if (paymentMethod === "BankTransfer") {
		if (!req.files || !req.files.bankReceipt) {
			throw new BadRequestError(
				"Please upload a bank receipt for verification."
			);
		}

		const uploadedReceipt = await uploadImageFile(req, "bankReceipt", "image");
		bankReceiptUrl = uploadedReceipt.secure_url;
	} else if (paymentMethod === "PaystackSubscription") {
		const planId = getPlanIdForMembershipType(membershipType);
		if (!planId) {
			throw new BadRequestError("Invalid subscription tier.");
		}

		//@ts-ignore
		const email = (req.user as { email: string }).email;
		subscriptionUrl = await createPaystackSubscription(email, planId);

		if (!subscriptionUrl) {
			throw new BadRequestError("Failed to create Paystack subscription.");
		}
	} else {
		throw new BadRequestError("Invalid payment method.");
	}

	const membership = await createMembershipService({
		user: userId,
		membershipType,
		paymentMethod,
		amount,
		status: "Pending",
		bankReceiptUrl,
		subscriptionUrl,
	});

	res
		.status(StatusCodes.CREATED)
		.json({ message: "Membership activated successfully", membership });
};

export const getMembershipDetails = async (req: Request, res: Response) => {
	try {
		//@ts-ignore
		const userId = req.user.userId;

		const membership = await findMembershipService(userId);

		if (!membership) {
			throw new NotFoundError("No membership found for this user.");
		}

		return res.status(StatusCodes.OK).json({
			membershipType: membership.membershipType,
			status: membership.status,
			paymentMethod: membership.paymentMethod,
			bankReceiptUrl: membership.bankReceiptUrl || null,
			activationDate: membership.activationDate,
			amount: membership.amount,
			subscriptionUrl: membership.subscriptionUrl || null,
		});
	} catch (error) {
		return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
			message: "An error occurred while fetching membership details",
		});
	}
};

export const subscribe = async (req: Request, res: Response) => {
	const email = "patiencesimoniseoluwa@gmail.com";
	const planId = "PLN_uey43rapmhe1zq7";
	const response = await createPaystackSubscription(email, planId);
	res.status(StatusCodes.OK).json({ response });
};
