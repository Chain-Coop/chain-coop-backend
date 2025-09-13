import { BadRequestError } from '../../../errors/bad-request';
import { InternalServerError } from '../../../errors/internal-server';
import axios from 'axios';
import { findUser } from '../../authService';
import {
  createWalletHistoryService,
  findWalletService,
  updateWalletService,
  findSingleWalletHistoryService,
  iWalletHistory,
} from '../../walletService';
import { NotFoundError } from '../../../errors';

export const verifyCryptoPaymentService = async (reference: string) => {
  if (!reference) {
    throw new BadRequestError('Payment reference is required');
  }

  const isRefExist = await findSingleWalletHistoryService({ ref: reference });
  if (isRefExist) {
    throw new BadRequestError('Payment already verified');
  }
  try {
    const response: any = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );
    const paymentData = response.data.data;
    if (paymentData.status === 'success') {
      const { amount, customer } = paymentData;
      const amountInNaira = amount / 100;
      const user = await findUser('email', customer.email);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      const wallet = await findWalletService({ user: user?.id || user._id });
      if (!wallet) {
        throw new NotFoundError('Wallet not found');
      }

      const updatedWallet = await updateWalletService(wallet._id, {
        balance: wallet.balance + amountInNaira,
      });

      if (!wallet.Card?.data) {
        //@ts-ignore
        wallet.Card = {
          data: paymentData.authorization.authorization_code,
          failedAttempts: 0,
        };
        wallet.markModified('Card');
        await wallet.save();
      }

      const historyPayload: iWalletHistory = {
        amount: amountInNaira,
        label: 'Wallet top up via Paystack for Crypto',
        ref: reference,
        type: 'credit',
        user: user._id as string,
      };

      await createWalletHistoryService(historyPayload);

      return updatedWallet;
    } else {
      throw new BadRequestError('Payment not successful');
    }
  } catch (error: any) {
    console.error('Error verifying payment:', error.message);
  }
};

export const transferToBankService = async (
  amount: number,
  userId: string,
  userEmail: string,
  cashWyreAccountNumber: string,
  cashWyrReference: string,
  chainCoopReference: string
) => {
  if (!amount || !userId || !userEmail || !cashWyreAccountNumber) {
    throw new BadRequestError('All fields are required for bank transfer');
  }

  try {
    const user = await findUser('email', userEmail);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const accountValidationResponse: any = await axios.get(
      `https://api.paystack.co/bank/resolve?account_number=${cashWyreAccountNumber}&bank_code=688`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    if (!accountValidationResponse.data.status) {
      throw new BadRequestError('Invalid bank account details');
    }

    const accountRecipientResponse: any = await axios.post(
      `https://api.paystack.co/transferrecipient`,
      {
        type: 'nuban',
        name: accountValidationResponse.data.data.account_name,
        account_number: accountValidationResponse.data.data.account_number,
        bank_code: '688', // Bank code for Moniepoint Microfinance Bank
        currency: 'NGN',
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    if (!accountRecipientResponse.data.status) {
      throw new BadRequestError('Failed to create transfer recipient');
    }

    const transferPayload = {
      source: 'balance',
      amount: amount * 100,
      recipient: accountRecipientResponse.data.data.recipient_code,
      reference: chainCoopReference,
      reason: `Transfer to Cashwyre account ${cashWyrReference}`,
    };
    const response: any = await axios.post(
      `https://api.paystack.co/transfer`,
      transferPayload,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    if (!response.data.status) {
      throw new BadRequestError('Transfer initiation failed');
    }

    return response.data.data;
  } catch (error) {
    console.error('Error in transferToBankService:', error);
  }
};
