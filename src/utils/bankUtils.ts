// src/utils/bankUtils.ts
import {
	createWalletService,
	findWalletService,
	updateWalletService,
	verifyBankDetailsService,
} from "../services/walletService";
import { BadRequestError } from "../errors";
import { iWallet } from "../services/walletService";
import { iContribution } from "../services/contributionService";

export const collectBankDetails = async (
	userId: string,
	accountNumber: string,
	bankCode: string,
	bankName: string
) => {
	try {
		let wallet = await findWalletService({ user: userId });
		if (!wallet) {
			// Create a new wallet if it doesn't exist
			wallet = await createWalletService({
				user: userId,
				balance: 0,
				isPinCreated: false,
				bankDetails: {
					accountNumber,
					bankCode,
					bankName,
				},
			});
		} else {
			// Update existing wallet with new bank details
			await updateWalletService(wallet._id, {
				bankDetails: { accountNumber, bankCode, bankName },
			});
		}

		await linkBankDetailsToContributionFund(userId, accountNumber, bankCode);

		return wallet;
	} catch (error) {
		if (error instanceof Error) {
			throw new BadRequestError(error.message);
		} else {
			throw new BadRequestError("An unexpected error occurred");
		}
	}
};

export const verifyBankDetails = async (
	accountNumber: string,
	bankCode: string,
	userId: string,
	bankName: string
) => {
	try {
		const verificationResult = await verifyBankDetailsService(
			accountNumber,
			bankCode,
			userId,
			bankName
		);
		return verificationResult;
	} catch (error) {
		if (error instanceof Error) {
			throw new BadRequestError(error.message);
		} else {
			throw new BadRequestError("An unexpected error occurred");
		}
	}
};

const linkBankDetailsToContributionFund = async (
	userId: string,
	accountNumber: string,
	bankCode: string
) => {
	//     // Implement the logic to link bank details to the contribution fund
	//
};
