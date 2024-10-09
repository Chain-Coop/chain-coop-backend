import axios from "axios";
import dotenv from "dotenv";
import { BadRequestError, InternalServerError } from "../errors";

dotenv.config();

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY!;
const PAYSTACK_SUBSCRIPTION_URL = "https://api.paystack.co/subscription";

type MembershipType = "Explorer" | "Pioneer" | "Voyager";

const plans: Record<MembershipType, string> = {
	Explorer: process.env.PAYSTACK_EXPLORER_PLAN_ID || "",
	Pioneer: process.env.PAYSTACK_PIONEER_PLAN_ID || "",
	Voyager: process.env.PAYSTACK_VOYAGER_PLAN_ID || "",
};

export const createPaystackSubscription = async (
	email: string,
	planId: string
) => {
	if (!PAYSTACK_SECRET_KEY) {
		throw new InternalServerError("Paystack secret key is not defined.");
	}
	const payload = { customer: email, plan: planId };
	console.log(payload);
	try {
		const response: any = await axios.post(PAYSTACK_SUBSCRIPTION_URL, payload, {
			headers: {
				Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
				"Content-Type": "application/json",
			},
		});

		console.log(response.data);
		return response?.data?.message;
	} catch (error: any) {
		console.log(error.response?.data);
		if (error.response) {
			throw new BadRequestError(
				`Paystack error: ${error.response.data.message}`
			);
		} else if (error.request) {
			throw new InternalServerError("No response received from Paystack.");
		} else {
			throw new InternalServerError(
				`Error creating Paystack subscription: ${error.message}`
			);
		}
	}
};

export const getPlanIdForMembershipType = (
	membershipType: MembershipType
): string | undefined => {
	const planId = plans[membershipType];
	if (!planId) {
		console.error(`No Plan ID found for membership type: ${membershipType}`);
	}
	return planId;
};
