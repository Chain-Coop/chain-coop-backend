import { createHmac } from "crypto";
import { Request, Response } from "express";
import {
	WebHookDataProps,
	createPin,
	createWalletHistoryService,
	findWalletHistoryService,
	findWalletService,
	iWalletHistory,
	updateWalletService,
} from "../services/walletService";
import { findUser } from "../services/authService";
import { BadRequestError } from "../errors";
import { StatusCodes } from "http-status-codes";
import uploadImageFile from "../utils/imageUploader";

const secret = process.env.PAYSTACK_KEY!;

const paystackWebhook = async (req: Request, res: Response) => {
	const hash = createHmac("sha512", secret)
		.update(JSON.stringify(req.body))
		.digest("hex");
	if (hash == req.headers["x-paystack-signature"]) {
		const { event, data } = req.body;
		if (event === "charge.success") {
			console.log("Transaction successful");
			creditWallet(data);
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
	res.status(200);
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
	const totalEarned = Number(userWallet.balance) + data.amount;

	const newWalletBalance = await updateWalletService(userWallet._id, {
		balance: totalEarned,
	});

	const historyPayload: iWalletHistory = {
		amount: data.amount,
		label: "Wallet top up successful",
		ref: data.reference,
		type: "credit",
		user: user._id,
	};

	const history = await createWalletHistoryService(historyPayload);
	console.log(userWallet, newWalletBalance, history);
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
	await createPin(userWallet?._id, req.body.pin);
	res.status(StatusCodes.OK).json({ msg: "Pin created successfully" });
};

const uploadReceipt = async (req: Request, res: Response) => {
    try {
        const uploadedFile = await uploadImageFile(req, 'receipt', 'image');
        res.status(StatusCodes.CREATED).json({ msg: "Receipt uploaded successfully", file: uploadedFile });
    } catch (error) {
        if (error instanceof BadRequestError) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: error.message });
        } else {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal Server Error" });
        }
    }
};


export { paystackWebhook, getWalletBalance, getWalletHistory, setWalletPin, uploadReceipt };
