import axios from "axios";
import { BadRequestError, NotFoundError } from "../errors";
import Wallet from "../models/wallet";
import WalletHistory from "../models/walletHistory";
import bcrypt from "bcryptjs";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY!;
const PAYSTACK_BANK_VERIFICATION_URL = "https://api.paystack.co/bank/resolve";

export interface iWallet {
	balance?: number;
	totalWithdrawn?: number;
	pin?: string;
	totalEarned?: number;
	user?: string;
	isPinCreated?: boolean;
	bankDetails?: {
		accountNumber: string;
		bankCode: string;
	};
}

export interface iWalletHistory {
	amount: number;
	label: string;
	type: string;
	ref: string;
	user: string;
}

export interface WebHookDataProps {
	amount: number;
	reference: string;
	id: string;
	paid_at: Date;
	channel: string;
	customer: {
		email: string;
	};
}

export const createWalletService = async (payload: iWallet) => {
	console.log("Creating wallet with payload:", payload);
	return await Wallet.create(payload);
};

export const createPin = async (id: any, payload: iWallet) => {
	const { pin } = payload;
	const wallet = await Wallet.findOne({ _id: id });
	if (!wallet) {
		throw new BadRequestError("Wallet not found");
	}

	wallet.pin = pin!;
	wallet.isPinCreated = true;
	await wallet.save();
};

export const findWalletService = async (payload: any) => {
	const wallet = await Wallet.findOne(payload);
	return wallet;
};

export const updateWalletService = async (id: any, payload: iWallet) => {
	console.log("Updating wallet with ID:", id, "Payload:", payload);
	const updatedWallet = await Wallet.findOneAndUpdate({ _id: id }, payload, {
		new: true,
		runValidators: true,
	});
	console.log("Updated wallet:", updatedWallet);
	return updatedWallet;
};

export const createWalletHistoryService = async (payload: iWalletHistory) =>
	await WalletHistory.create(payload);

export const findWalletHistoryService = async (payload: any) =>
	await WalletHistory.find(payload).sort({ createdAt: -1 });

export const findSingleWalletHistoryService = async (payload: any) =>
	await WalletHistory.findOne(payload);

export const verifyBankDetailsService = async (
	accountNumber: string,
	bankCode: string
) => {
	try {
		const response: any = await axios.get(PAYSTACK_BANK_VERIFICATION_URL, {
			params: {
				account_number: accountNumber,
				bank_code: bankCode,
			},
			headers: {
				Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
			},
		});
		return response.data;
	} catch (error: any) {
		console.error(error);
		throw new BadRequestError("Bank verification failed");
	}
};

// Function to validate wallet pin
export const validateWalletPin = async (userId: string, pin: string) => {
	try {
		const wallet = await Wallet.findOne({ user: userId });

		if (!wallet) {
			console.error(`No wallet found for user ID: ${userId}`);
			throw new BadRequestError("Wallet not found.");
		}

		if (!wallet.pin) {
			console.error(`Wallet pin not set for user ID: ${userId}`);
			throw new BadRequestError("Pin not set for the wallet.");
		}

		console.log(`Comparing pin: ${pin} with hashed pin: ${wallet.pin}`);

		// Compare the provided pin with the stored hashed pin
		const isMatch = await bcrypt.compare(pin, wallet.pin);
		console.log(`Pin match result: ${isMatch}`);

		return isMatch;
	} catch (error) {
		console.error(`Error validating pin for user ID: ${userId}`, error);
		throw new BadRequestError("Error validating wallet pin.");
	}
};

//GET ALL FUNDED PROJECTS
export const getUserFundedProjectsService = async (
    userId: string
) => {
    const wallet = await Wallet.findOne({ user: userId }).populate(
		"fundedProjects.projectId", "title description documentUrl"
	);
	
    if (!wallet) {
        throw new NotFoundError("Wallet not found");
    }
    return wallet;
};
