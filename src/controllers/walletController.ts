import {
    createPin,
    findWalletService,
    updateWalletService,
    createWalletService,
    createWalletHistoryService,
    verifyBankDetailsService,
    WebHookDataProps,
    iWalletHistory,
} from '../services/walletService';
import Withdrawal from '../models/withdrawal';
import { Request, Response } from 'express';
import { BadRequestError } from '../errors';
import { StatusCodes } from 'http-status-codes';
import uploadImageFile from '../utils/imageUploader';
import { findUser } from '../services/authService';
import { createHmac } from 'crypto';

const secret = process.env.PAYSTACK_KEY!;

const paystackWebhook = async (req: Request, res: Response) => {
    const hash = createHmac('sha512', secret)
        .update(JSON.stringify(req.body))
        .digest('hex');
    if (hash === req.headers['x-paystack-signature']) {
        const { event, data } = req.body;
        if (event === 'charge.success') {
            console.log('Transaction successful');
            await creditWallet(data);
        }
        if (event === 'transfer.success') {
            console.log('Transfer successful', data);
        }
        if (event === 'transfer.failed') {
            console.log('Transfer failed', data);
        }
        if (event === 'transfer.reversed') {
            console.log('Transfer reversed', data);
        }
    }
    res.status(200).send();
};

const creditWallet = async (data: WebHookDataProps) => {
    const user = await findUser('email', data.customer.email);
    if (!user) {
        console.log('User does not exist');
        return;
    }
    const userWallet = await findWalletService({ user: user._id });
    if (!userWallet) {
        console.log('Wallet does not exist');
        return;
    }
    const totalEarned = Number(userWallet.balance) + data.amount;

    const newWalletBalance = await updateWalletService(userWallet._id, {
        balance: totalEarned,
    });

    const historyPayload: iWalletHistory = {
        amount: data.amount,
        label: 'Wallet top up successful',
        ref: data.reference,
        type: 'credit',
        user: user._id,
    };

    const history = await createWalletHistoryService(historyPayload);
    console.log(userWallet, newWalletBalance, history);
};

const getWalletBalance = async (req: Request, res: Response) => {
    //@ts-ignore
    const userWallet = await findWalletService({ user: req.user.userId });
    if (!userWallet) {
        throw new BadRequestError('Invalid token');
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
        throw new BadRequestError('Wallet does not exist');
    }
    if (userWallet.isPinCreated) {
        throw new BadRequestError('You have created a pin already');
    }
    await createPin(userWallet._id, req.body.pin);
    res.status(StatusCodes.OK).json({ msg: 'Pin created successfully' });
};

const uploadReceipt = async (req: Request, res: Response) => {
    try {
        const uploadedFile = await uploadImageFile(req, 'receipt', 'image');
        res.status(StatusCodes.CREATED).json({ msg: 'Receipt uploaded successfully', file: uploadedFile });
    } catch (error) {
        if (error instanceof BadRequestError) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: error.message });
        } else {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Internal Server Error' });
        }
    }
};

const collectBankDetails = async (req: Request, res: Response) => {
    try {
        //@ts-ignore
        const userId = req.user.userId;
        console.log('User ID:', userId);

        const { accountNumber, bankCode } = req.body; 

        let wallet = await findWalletService({ user: userId });
        if (!wallet) {
            console.log('Wallet not found, creating a new one.');

            // Create a new wallet for the user
            wallet = await createWalletService({
                user: userId,
                balance: 0, 
                isPinCreated: false,
                bankDetails: {
                    accountNumber,
                    bankCode
                }
            });
            console.log('New wallet created:', wallet);
        } else {
            // Update existing wallet with new bank details
            await updateWalletService(wallet._id, { bankDetails: { accountNumber, bankCode } });
        }

        res.status(StatusCodes.OK).json({ msg: 'Bank details updated successfully' });
    } catch (error) {
        // Type guard to check if error is an instance of Error
        if (error instanceof Error) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: error.message });
        } else {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'An unexpected error occurred' });
        }
    }
};

const verifyBankDetails = async (req: Request, res: Response) => {
    try {
        const { accountNumber, bankCode } = req.body;
        const verificationResult = await verifyBankDetailsService(accountNumber, bankCode);
        res.status(StatusCodes.OK).json({ msg: 'Bank details verified', result: verificationResult });
    } catch (error) {
        // Type guard to check if error is an instance of Error
        if (error instanceof Error) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: error.message });
        } else {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'An unexpected error occurred' });
        }
    }
};

// New function for requesting a withdrawal
const requestWithdrawal = async (req: Request, res: Response) => {
    try {
        //@ts-ignore
        const userId = req.user.userId;
        const { amount } = req.body; // Ensure amount is validated

        const wallet = await findWalletService({ user: userId });
        if (!wallet) {
            throw new BadRequestError('Wallet not found');
        }

        if (wallet.balance < amount) {
            throw new BadRequestError('Insufficient balance');
        }

        // Create withdrawal request
        const withdrawal = await Withdrawal.create({
            user: userId,
            amount,
            bankDetails: wallet.bankDetails,
        });

        // Update wallet balance
        await updateWalletService(wallet._id, { balance: wallet.balance - amount });

        res.status(StatusCodes.CREATED).json({ msg: 'Withdrawal request created successfully', withdrawal });
    } catch (error) {
			 //@ts-ignore
        res.status(StatusCodes.BAD_REQUEST).json({ error: error.message });
    }
};


const getWithdrawalRequests = async (req: Request, res: Response) => {
    try {
        //@ts-ignore
        const userId = req.user.userId;
        const withdrawals = await Withdrawal.find({ user: userId }).sort({ createdAt: -1 });
        res.status(StatusCodes.OK).json(withdrawals);
    } catch (error) {
		 //@ts-ignore
        res.status(StatusCodes.BAD_REQUEST).json({ error: error.message });
    }
};

export { paystackWebhook, getWalletBalance, getWalletHistory, setWalletPin, uploadReceipt, collectBankDetails, verifyBankDetails, requestWithdrawal, getWithdrawalRequests };
