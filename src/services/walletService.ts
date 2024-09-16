import axios from 'axios';
import { BadRequestError } from '../errors';
import Wallet from '../models/wallet';
import WalletHistory from '../models/walletHistory';

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY!;
const PAYSTACK_BANK_VERIFICATION_URL = 'https://api.paystack.co/bank/resolve';

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
	console.log('Creating wallet with payload:', payload);
	return await Wallet.create(payload);
  };

export const createPin = async (id: any, payload: iWallet) => {
    const { pin } = payload;
    const wallet = await Wallet.findOne({ _id: id });
    if (!wallet) {
        throw new BadRequestError('Wallet not found');
    }
    wallet.pin = pin!;
    wallet.isPinCreated = true;
    await wallet.save();
};

export const findWalletService = async (payload: any) => {
    console.log('Fetching wallet with:', payload);
    const wallet = await Wallet.findOne(payload);
    console.log('Fetched wallet:', wallet);
    return wallet;
};

export const updateWalletService = async (id: any, payload: iWallet) => {
	console.log('Updating wallet with ID:', id, 'Payload:', payload);
	const updatedWallet = await Wallet.findOneAndUpdate({ _id: id }, payload, {
	  new: true,
	  runValidators: true,
	});
	console.log('Updated wallet:', updatedWallet);
	return updatedWallet;
  };

  
export const createWalletHistoryService = async (payload: iWalletHistory) =>
    await WalletHistory.create(payload);

export const findWalletHistoryService = async (payload: any) =>
    await WalletHistory.find(payload).sort({ createdAt: -1 });

export const verifyBankDetailsService = async (accountNumber: string, bankCode: string) => {
    try {
        const response = await axios.get(PAYSTACK_BANK_VERIFICATION_URL, {
            params: {
                account_number: accountNumber,
                bank_code: bankCode
            },
            headers: {
                Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`
            }
        });
        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            // Handle Axios error
            console.error('Error verifying bank details:', error.response ? error.response.data : error.message);
        } else {
            // Handle non-Axios error
            console.error('Error verifying bank details:', error);
        }
        throw new BadRequestError('Bank verification failed');
    }
};
