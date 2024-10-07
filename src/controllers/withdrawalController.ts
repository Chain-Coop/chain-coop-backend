import { Request, Response } from "express";
import {
	createWithdrawalRequest,
	updateWithdrawalStatus,
	findWithdrawalById,
} from "../services/withdrawalService";
import { BadRequestError, ForbiddenError } from "../errors";
import { StatusCodes } from "http-status-codes";
import axios from "axios";
import { sendEmail, EmailOptions } from "../utils/sendEmail";
import { getAllWithdrawals } from "../services/withdrawalService";
import {
	findWalletService,
	validateWalletPin,
} from "../services/walletService";
import { logUserOperation } from "../middlewares/logging";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const ADMIN_EMAIL = process.env.EMAIL_ADDRESS;
// console.log(ADMIN_EMAIL, PAYSTACK_SECRET_KEY);

if (!PAYSTACK_SECRET_KEY || !ADMIN_EMAIL) {
	throw new Error("Required environment variables are not defined.");
}

export const requestWithdrawal = async (req: Request, res: Response) => {
	let userId = null;
	try {
		//@ts-ignore
		userId = req.user.userId;
		const { amount, accountNumber, bankCode, pin } = req.body;

		if (!amount || !accountNumber || !bankCode || !pin) {
			throw new BadRequestError(
				"Amount, account number, bank code, and pin are required"
			);
		}

		// Validate the wallet
		const userWallet = await findWalletService({ user: userId });
		if (!userWallet) {
			throw new BadRequestError("Wallet not found.");
		}

		if (!userWallet.isPinCreated) {
			throw new BadRequestError("Pin not set for the wallet.");
		}

		// Validate wallet pin
		const isPinValid = await validateWalletPin(userId, pin);
		if (!isPinValid) {
			throw new BadRequestError("Invalid wallet pin");
		}

		// Verify the bank account details using Paystack
		const verifyResponse = await axios.get(
			"https://api.paystack.co/bank/resolve",
			{
				params: {
					account_number: accountNumber,
					bank_code: bankCode,
				},
				headers: {
					Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
				},
			}
		);
		//@ts-ignore
		const accountDetails = verifyResponse.data.data;
		if (!accountDetails) {
			throw new BadRequestError("Invalid bank account details");
		}

		// Create withdrawal request
		const withdrawal = await createWithdrawalRequest(userId, amount, {
			accountNumber,
			bankCode,
		});

		// Prepare email details
		const emailOptions: EmailOptions = {
			to: ADMIN_EMAIL,
			subject: "New Withdrawal Request",
			html: `
              <h3>New Withdrawal Request</h3>
              <p><strong>User ID:</strong> ${userId}</p>
              <p><strong>Amount:</strong> ${amount}</p>
              <p><strong>Account Number:</strong> ${accountNumber}</p>
              <p><strong>Bank Code:</strong> ${bankCode}</p>
              <p><strong>Status:</strong> Pending</p>
          `,
		};

		// Send email notification to admin
		await sendEmail(emailOptions);

		await logUserOperation(userId, req, "WITHDRAWAL_REQUEST", "Success");
		res.status(StatusCodes.CREATED).json({
			message: "Withdrawal request created successfully",
			withdrawal,
		});
	} catch (error) {
		await logUserOperation(userId, req, "WITHDRAWAL_REQUEST", "Failure");
		if (error instanceof Error) {
			res.status(StatusCodes.BAD_REQUEST).json({ error: error.message });
		} else {
			res
				.status(StatusCodes.INTERNAL_SERVER_ERROR)
				.json({ error: "Internal Server Error" });
		}
	}
};

// PATCH: Update withdrawal status (Admin only)
export const updateWithdrawalStatusController = async (
	req: Request,
	res: Response
) => {
	try {
		//@ts-ignore
		const user = req.user;
		const { withdrawalId } = req.params;
		const { status } = req.body;

		// Only admin users can access this route
		if (!user.isAdmin) {
			throw new ForbiddenError("You are not authorized to perform this action");
		}

		// Validate the status input
		const validStatuses = ["pending", "completed", "failed"];
		if (!validStatuses.includes(status)) {
			throw new BadRequestError(
				"Invalid status. Status must be one of: pending, completed, failed"
			);
		}

		// Find the withdrawal by its ID
		const withdrawal = await findWithdrawalById(withdrawalId);
		if (!withdrawal) {
			return res.status(StatusCodes.NOT_FOUND).json({
				message: "Withdrawal request not found",
			});
		}

		// Update the withdrawal status
		const updatedWithdrawal = await updateWithdrawalStatus(
			withdrawalId,
			status
		);

		return res.status(StatusCodes.OK).json({
			message: "Withdrawal status updated successfully",
			updatedWithdrawal,
		});
	} catch (error) {
		return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
			message: error instanceof Error ? error.message : "An error occurred",
		});
	}
};

// GET: List all withdrawal requests
export const listAllWithdrawals = async (req: Request, res: Response) => {
	try {
		const withdrawals = await getAllWithdrawals();
		res.status(StatusCodes.OK).json({
			message: "Withdrawals retrieved successfully",
			withdrawals,
		});
	} catch (error) {
		res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
			message: error instanceof Error ? error.message : "An error occurred",
		});
	}
};
