import {
    createPin,
    findWalletService,
    updateWalletService,
    createWalletService,
    createWalletHistoryService,
    WebHookDataProps,
    iWalletHistory,
	verifyBankDetailsService,
} from '../services/walletService';
import { Request, Response } from 'express';
import { BadRequestError } from '../errors';
import { StatusCodes } from 'http-status-codes';
import uploadImageFile from '../utils/imageUploader';
import { findUser } from '../services/authService';
import { createHmac } from 'crypto';
import bcrypt from "bcryptjs"; 



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

    // Hash the pin before saving it
    const salt = await bcrypt.genSalt(10);
    const hashedPin = await (req.body.pin);

    await createPin(userWallet._id, { pin: hashedPin }); // Save hashed pin
    res.status(StatusCodes.OK).json({ msg: 'Pin created successfully' });
};

  

const uploadReceipt = async (req: Request, res: Response) => {
    try {
        const uploadedFile = await uploadImageFile(req, 'receipt', 'image');
        res.status(StatusCodes.CREATED).json({ msg: 'Receipt uploaded successfully', file: uploadedFile });
    } catch (error) {
        if (error instanceof Error) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: error.message });
        } else {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Internal Server Error' });
        }
    }
};

export const collectBankDetailsHandler = async (req: Request, res: Response) => {
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
            await updateWalletService(wallet._id, { bankDetails: { accountNumber, bankCode } });
        }

        res.status(StatusCodes.OK).json({ msg: 'Bank details updated successfully' });
    } catch (error) {
		//@ts-ignore
        res.status(StatusCodes.BAD_REQUEST).json({ error: error.message });
    }
};

export const verifyBankDetailsHandler = async (req: Request, res: Response) => {
    try {
        const { accountNumber, bankCode } = req.body;
        const verificationResult = await verifyBankDetailsService(accountNumber, bankCode);
        res.status(StatusCodes.OK).json({ msg: 'Bank details verified', result: verificationResult });
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
  
	  res.status(StatusCodes.OK).json({ message: "Wallet funded successfully", newBalance });
	} catch (error) {
	  if (error instanceof Error) {
		res.status(StatusCodes.BAD_REQUEST).json({ error: error.message });
	  } else {
		res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Internal Server Error' });
	  }
	}
  };

  

export {
    paystackWebhook,
    getWalletBalance,
    getWalletHistory,
    setWalletPin,
    uploadReceipt,
    collectBankDetailsHandler as collectBankDetails,
    verifyBankDetailsHandler as verifyBankDetails
};

