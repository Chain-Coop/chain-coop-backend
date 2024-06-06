import { BadRequestError } from "../errors";
import Wallet from "../models/wallet";
import WalletHistory from "../models/walletHistory";

export interface iWallet {
	balance?: number;
	totalWithdrawn?: number;
	pin?: string;
	totalEarned?: number;
	user?: string;
	isPinCreated?: boolean;
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

export const createWalletService = async (payload: iWallet) =>
	await Wallet.create(payload);

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

export const findWalletService = async (payload: any) =>
	await Wallet.findOne(payload);

export const updateWalletService = async (id: any, payload: iWallet) =>
	await Wallet.findOneAndUpdate({ _id: id }, payload, {
		new: true,
		runValidators: true,
	});

export const createWalletHistoryService = async (payload: iWalletHistory) =>
	await WalletHistory.create(payload);

export const findWalletHistoryService = async (payload: any) =>
	await WalletHistory.find(payload).sort({ createdAt: -1 });
