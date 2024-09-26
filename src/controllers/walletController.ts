import {
	createPin,
	findWalletService,
	updateWalletService,
	createWalletService,
	createWalletHistoryService,
	WebHookDataProps,
	iWalletHistory,
	verifyBankDetailsService,
	findWalletHistoryService,
	findSingleWalletHistoryService,
} from "../services/walletService";
import { Request, Response } from "express";
import { BadRequestError } from "../errors";
import { StatusCodes } from "http-status-codes";
import uploadImageFile from "../utils/imageUploader";
import { findUser } from "../services/authService";
import { createHmac } from "crypto";
import bcrypt from "bcryptjs";
import axios from "axios";

const secret = process.env.PAYSTACK_SECRET_KEY!;

const paystackWebhook = async (req: Request, res: Response) => {
	const hash = createHmac("sha512", secret)
		.update(JSON.stringify(req.body))
		.digest("hex");

	if (hash === req.headers["x-paystack-signature"]) {
		const { event, data } = req.body;
		if (event === "charge.success") {
			console.log("Transaction successful");
			await creditWallet(data);
		}
		if (event === "transfer.success") {
			console.log("Transfer successful", data);
		}
		if (event === "transfer.failed") {
			console.log("Transfer failed", data);
		}
		if (event === "transfer.reversed") {
			console.log("Transfer reversed", data);
		}
		// ... other event handlers remain the same
	}
	res.status(StatusCodes.OK).send();
};

const creditWallet = async (data: WebHookDataProps) => {
	const user = await findUser("email", data.customer.email);
	if (!user) {
		console.log("User does not exist");
		return;
	}
	const userWallet = await findWalletService({ user: user._id });
	if (!userWallet) {
		console.log("Wallet does not exist");
		return;
	}

	// Calculate new balance
	const newBalance = userWallet.balance + data.amount / 100; 

	// Update wallet balance
	await updateWalletService(userWallet._id, {
		balance: newBalance,
	});

	// Create wallet history entry
	const historyPayload: iWalletHistory = {
		amount: data.amount / 100, 
		label: "Wallet top up via Paystack",
		ref: data.reference,
		type: "credit",
		user: user._id as string,
	};

	await createWalletHistoryService(historyPayload);

	console.log(`Wallet credited. New balance: ${newBalance}`);
};

const initiatePayment = async (req: Request, res: Response) => {
	const { amount } = req.body;
	//@ts-ignore
	const email = req.user.email;

	if (!amount || !email) {
		throw new BadRequestError("Amount and email are required");
	}

	try {
		const response: any = await axios.post(
			"https://api.paystack.co/transaction/initialize",
			{
				email,
				amount,
				callback_url:
					"http://localhost:5173/dashboard/wallet/fund_wallet/verify_transaction",
			},
			{
				headers: {
					Authorization: `Bearer ${secret}`,
				},
			}
		);

		res.status(StatusCodes.OK).json({
			message: "Payment initiated successfully",
			paymentUrl: response.data.data.authorization_url,
		});
	} catch (error: any) {
		console.error(error);
		res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
			message: "Failed to initiate payment",
			error: error.response ? error.response.data : error.message,
		});
	}
};

const verifyPayment = async (req: Request, res: Response) => {
	const { reference } = req.body;

	const isRefExist = await findSingleWalletHistoryService({ ref: reference });
	if (isRefExist) {
		throw new BadRequestError("Payment already verified");
	}
	if (!reference) {
		throw new BadRequestError("Payment reference is required");
	}
	try {
		const response: any = await axios.get(
			`https://api.paystack.co/transaction/verify/${reference}`,
			{
				headers: {
					Authorization: `Bearer ${secret}`,
				},
			}
		);
		const paymentData = response.data.data;
		if (paymentData.status === "success") {
			const { amount, customer } = paymentData;

			console.log({ amount, customer });
			const user = await findUser("email", customer.email);
			console.log(user);
			if (!user) {
				throw new BadRequestError("user not found");
			}

			const wallet = await findWalletService({ user: user?.id });
			if (!wallet) {
				throw new BadRequestError("Wallet not found");
			}

			const updatedWallet = await updateWalletService(wallet._id, {
				balance: wallet.balance + amount / 100,
			});

			const historyPayload: iWalletHistory = {
				amount: amount,
				label: "Wallet top up via Paystack",
				ref: reference,
				type: "credit",
				user: user._id as string,
			};

			await createWalletHistoryService(historyPayload);

			res.status(StatusCodes.OK).json({
				message: "Payment verified and wallet topped up successfully",
				updatedBalance: updatedWallet?.balance,
			});
		} else {
			res.status(StatusCodes.BAD_REQUEST).json({
				message: "Payment verification failed",
				status: paymentData.status,
			});
		}
	} catch (error: any) {
		console.error(error);
		res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
			message: "Failed to verify payment",
			error: error.response ? error.response.data : error.message,
		});
	}
};

const getWalletBalance = async (req: Request, res: Response) => {
	//@ts-ignore
	const userWallet = await findWalletService({ user: req.user.userId });
	if (!userWallet) {
		throw new BadRequestError("Invalid token");
	}
	res.status(StatusCodes.OK).json(userWallet);
};

const getWalletHistory = async (req: Request, res: Response) => {
	//@ts-ignore
	const userWallet = await findWalletHistoryService({ user: req.user.userId });
	res.status(StatusCodes.OK).json(userWallet);
};

const setWalletPin = async (req: Request, res: Response) => {
	//@ts-ignore
	const userWallet = await findWalletService({ user: req.user.userId });

	if (!userWallet) {
		throw new BadRequestError("Wallet does not exist");
	}

	if (userWallet.isPinCreated) {
		throw new BadRequestError("You have created a pin already");
	}

	// Hash the pin before saving it
	const salt = await bcrypt.genSalt(10);
	const hashedPin = await req.body.pin;

	await createPin(userWallet._id, { pin: hashedPin }); // Save hashed pin
	res.status(StatusCodes.OK).json({ msg: "Pin created successfully" });
};

const uploadReceipt = async (req: Request, res: Response) => {
	try {
		const uploadedFile = await uploadImageFile(req, "receipt", "image");
		res
			.status(StatusCodes.CREATED)
			.json({ msg: "Receipt uploaded successfully", file: uploadedFile });
	} catch (error) {
		if (error instanceof Error) {
			res.status(StatusCodes.BAD_REQUEST).json({ error: error.message });
		} else {
			res
				.status(StatusCodes.INTERNAL_SERVER_ERROR)
				.json({ error: "Internal Server Error" });
		}
	}
};

export const collectBankDetailsHandler = async (
	req: Request,
	res: Response
) => {
	try {
		//@ts-ignore
		const userId = req.user.userId;
		const { accountNumber, bankCode } = req.body;

		let wallet = await findWalletService({ user: userId });
		if (!wallet) {
			wallet = await createWalletService({
				user: userId,
				balance: 0,
				isPinCreated: false,
				bankDetails: { accountNumber, bankCode },
			});
		} else {
			await updateWalletService(wallet._id, {
				bankDetails: { accountNumber, bankCode },
			});
		}

		res
			.status(StatusCodes.OK)
			.json({ msg: "Bank details updated successfully" });
	} catch (error) {
		//@ts-ignore
		res.status(StatusCodes.BAD_REQUEST).json({ error: error.message });
	}
};

export const verifyBankDetailsHandler = async (req: Request, res: Response) => {
	try {
		const { accountNumber, bankCode } = req.body;
		const verificationResult = await verifyBankDetailsService(
			accountNumber,
			bankCode
		);
		res
			.status(StatusCodes.OK)
			.json({ msg: "Bank details verified", result: verificationResult });
	} catch (error) {
		//@ts-ignore
		res.status(StatusCodes.BAD_REQUEST).json({ error: error.message });
	}
};

export const fundWallet = async (req: Request, res: Response) => {
	try {
		//@ts-ignore
		const userId = req.user.userId;
		const { amount } = req.body;

		if (amount <= 0) {
			throw new BadRequestError("Amount must be greater than zero");
		}

		const wallet = await findWalletService({ user: userId });
		if (!wallet) {
			throw new BadRequestError("Wallet not found");
		}

		// Add the amount to the wallet
		const newBalance = wallet.balance + amount;
		await updateWalletService(wallet._id, { balance: newBalance });

		res
			.status(StatusCodes.OK)
			.json({ message: "Wallet funded successfully", newBalance });
	} catch (error) {
		if (error instanceof Error) {
			res.status(StatusCodes.BAD_REQUEST).json({ error: error.message });
		} else {
			res
				.status(StatusCodes.INTERNAL_SERVER_ERROR)
				.json({ error: "Internal Server Error" });
		}
	}
};

export {
	// paystackWebhook,
	getWalletBalance,
	getWalletHistory,
	setWalletPin,
	uploadReceipt,
	collectBankDetailsHandler as collectBankDetails,
	verifyBankDetailsHandler as verifyBankDetails,
	initiatePayment,
	verifyPayment,
};
