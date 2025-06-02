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
	setPreferredCardService,
	verifyAccountDetailsService,
	DepositLimitChecker,
	getBanksService,
} from "../services/walletService";
import { Request, Response } from "express";
import { BadRequestError } from "../errors";
import { StatusCodes } from "http-status-codes";
import uploadImageFile from "../utils/imageUploader";
import { findUser, getUserDetails } from "../services/authService";
import axios from "axios";
import { generateAndSendOtp } from "../utils/sendOtp";
import { findOtp } from "../services/otpService";
import { deleteCard, getCustomer } from "../services/paystackService";
import { addtoLimit } from "../services/dailyServices";
import User from "../models/user";

const secret = process.env.PAYSTACK_SECRET_KEY!;

const initiatePayment = async (req: Request, res: Response) => {
	const { amount } = req.body;
	//@ts-ignore
	const email = req.user.email;

	if (!amount || !email) {
		throw new BadRequestError("Amount and email are required");
	}

	const user = await findUser("email", email);
	if (!user) {
		throw new BadRequestError("User not found");
	}

	await DepositLimitChecker(user, amount);

	try {
		const response: any = await axios.post(
			"https://api.paystack.co/transaction/initialize",
			{
				email,
				amount: amount * 100,
				callback_url: "https://chaincoop.org/dashboard/wallet",
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
			const user = await findUser("email", customer.email);
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

			await addtoLimit(user.id, amount / 100, "deposit");

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
	// Get all banks
	const banks = await getBanksService();

	//@ts-ignore
	const userWallet = await findWalletService({ user: req.user.userId });

	if (!userWallet) {
		throw new BadRequestError("Invalid token");
	}

	// Convert wallet to plain object
	const walletObj = userWallet.toObject();

	// Add bankName to each bank account and ensure it's a plain object
	const updatedBankAccounts = walletObj.bankAccounts.map((bank: any) => {
		const bankName = banks.find((b) => b.code === bank.bankCode)?.name;
		return {
			accountNumber: bank.accountNumber,
			bankCode: bank.bankCode,
			accountName: bank.accountName,
			bankId: bank.bankId,
			_id: bank._id,
			bankName: bankName || "Unknown Bank",
		};
	});

	// Create response with clean structure
	const response = {
		...walletObj,
		bankAccounts: updatedBankAccounts,
	};

	res.status(StatusCodes.OK).json(response);
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
		const { accountNumber, bankCode, bankName } = req.body;
		//@ts-ignore
		const userId = req.user.userId; // Get the userId from the request

		// Pass userId along with accountNumber and bankCode to the service
		const verificationResult = await verifyBankDetailsService(
			accountNumber,
			bankCode,
			userId,
			bankName
		);

		res
			.status(StatusCodes.OK)
			.json({ msg: "Bank details verified", result: verificationResult });
	} catch (error) {
		//@ts-ignore
		res.status(StatusCodes.BAD_REQUEST).json({ error: error.message });
	}
};

export const verifyAccountDetailsHandler = async (
	req: Request,
	res: Response
) => {
	try {
		const { accountNumber, bankCode } = req.body;
		const verificationResult = await verifyAccountDetailsService(
			accountNumber,
			bankCode
		);
		res
			.status(StatusCodes.OK)
			.json({ msg: "Account details verified", result: verificationResult });
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

export const validateOtp = async (req: Request, res: Response) => {
	const { otp } = req.body;

	if (!otp) {
		throw new BadRequestError("OTP is required");
	}

	//@ts-ignore
	const id = req.user.userId;
	const user = await getUserDetails(id);

	const validOtp = await findOtp(user!.email, otp);
	if (!validOtp) {
		throw new BadRequestError("Invalid or expired OTP");
	}

	res
		.status(StatusCodes.OK)
		.json({ msg: "OTP is valid. You can now change your PIN." });
};

export const GetCards = async (req: Request, res: Response) => {
	//@ts-ignore
	const id = req.user.userId;

	const user = await getUserDetails(id);
	const cards = (await getCustomer(user!.email)) as {
		data: { authorizations: any[] };
	};

	res.status(StatusCodes.OK).json({
		cards: cards.data.authorizations,
	});
};

export const DeleteCard = async (req: Request, res: Response) => {
	const { cardId } = req.body;

	deleteCard(cardId)
		.then((_response) => {
			res.status(StatusCodes.OK).json({
				msg: "Card Successfully Deleted",
			});
		})
		.catch((error) => {
			res.status(StatusCodes.BAD_REQUEST).json({
				error: error.message,
			});
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
