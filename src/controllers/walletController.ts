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
	deleteCardService,
	setPreferredCardService,
} from "../services/walletService";
import { Request, Response } from "express";
import { BadRequestError } from "../errors";
import { StatusCodes } from "http-status-codes";
import uploadImageFile from "../utils/imageUploader";
import { findUser, getUserDetails } from "../services/authService";
import { createHmac } from "crypto";
import bcrypt from "bcryptjs";
import axios from "axios";
import { generateAndSendOtp } from "../utils/sendOtp";
import { findOtp } from "../services/otpService";

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
	const newBalance = userWallet.balance + data.amount;

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
				metadata: {
					type: "wallet_funding",
				},
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

	if (!reference) {
		throw new BadRequestError("Payment reference is required");
	}

	const isRefExist = await findSingleWalletHistoryService({ ref: reference });
	if (isRefExist) {
		throw new BadRequestError("Payment already verified");
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
		const { accountNumber, bankCode, bankName } = req.body;

		let wallet = await findWalletService({ user: userId });
		if (!wallet) {
			wallet = await createWalletService({
				user: userId,
				balance: 0,
				isPinCreated: false,
				bankDetails: { accountNumber, bankCode, bankName },
			});
		} else {
			await updateWalletService(wallet._id, {
				bankDetails: { accountNumber, bankCode, bankName },
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
		//@ts-ignore
		const userId = req.user.userId; // Get the userId from the request

		// Pass userId along with accountNumber and bankCode to the service
		const verificationResult = await verifyBankDetailsService(
			accountNumber,
			bankCode,
			userId
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

export const GeneratePinOtp = async (req: Request, res: Response) => {
	//@ts-ignore
	const id = req.user.userId;
	const user = await getUserDetails(id);

	await generateAndSendOtp({
		email: user!.email,
		message: "Your OTP to change your pin is",
		subject: "Pin verification",
	});

	res.status(StatusCodes.CREATED).json({
		msg: "OTP successfully sent to your email",
	});
};

export const ChangePin = async (req: Request, res: Response) => {
	const { otp, newpin } = req.body;

	//@ts-ignore
	const id = req.user.userId;
	const user = await getUserDetails(id);

	const validOtp = await findOtp(user!.email, otp);
	if (!validOtp) {
		throw new BadRequestError("Invalid otp provided");
	}

	const wallet = await findWalletService({ user: id });
	if (!wallet) {
		throw new BadRequestError("Wallet not found");
	}

	wallet.pin = newpin;
	wallet.isPinCreated = true;
	await wallet.save();

	res.status(StatusCodes.OK).json({
		msg: "Pin Successfully Changed",
	});
};

export const DeleteCard = async (req: Request, res: Response) => {
	const { cardId } = req.body;

	//@ts-ignore
	const id = req.user.userId;

	await deleteCardService(id, cardId);

	res.status(StatusCodes.OK).json({
		msg: "Card Successfully Deleted",
	});
};

export const setPreferredCard = async (req: Request, res: Response) => {
	const { cardId } = req.body;

	//@ts-ignore
	const id = req.user.userId;

	await setPreferredCardService(id, cardId);

	res.status(StatusCodes.OK).json({
		msg: "Preferred Card Successfully Set",
	});
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
