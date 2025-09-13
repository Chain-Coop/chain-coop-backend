import { Request, Response } from 'express';
import { BadRequestError } from '../../errors/bad-request';
import axios from 'axios';
import { findUser } from '../../services/authService';
import { StatusCodes } from 'http-status-codes';
import {
  findWalletService,
  chargeCardService,
} from '../../services/walletService';
import { PaystackCashwyre } from '../../models/web3/paystackCashwyre';
import { getUserWeb3Wallet } from '../../services/web3/accountService';
import User from '../../models/authModel';

const secret = process.env.PAYSTACK_SECRET_KEY!;
interface UserData {
  email: string;
  _id: string;
}

const initiateCryptoPayment = async (req: Request, res: Response) => {
  const { amount, paymentMethod } = req.body;
  //@ts-ignore
  const email = req.user.email;

  if (!amount || !email) {
    throw new BadRequestError('Amount and email are required');
  }

  const user: UserData | null = await User.findOne({ email }).select(
    '_id email'
  );
  if (!user) {
    throw new BadRequestError('User not found');
  }
  //@ts-ignore
  const wallet = await findWalletService({ user: user._id });
  if (!wallet) {
    throw new BadRequestError('Wallet not found');
  }
  const walletWeb3 = await getUserWeb3Wallet(user._id);
  // await DepositLimitChecker(user, amount);

  // Calculate Paystack fee
  const feePercentage = 0.015;
  const flatFee = 100;
  const cap = 2000;

  let charge = amount * feePercentage;
  if (amount >= 2500) {
    charge += flatFee;
  }
  if (charge > cap) {
    charge = cap;
  }

  const roundedCharge = Math.ceil(charge);
  const totalAmountToPay = amount + roundedCharge;

  if (paymentMethod !== 'card' && paymentMethod !== 'paystack') {
    throw new BadRequestError('Invalid payment method');
  }

  const data = new PaystackCashwyre({
    userEmail: email,
    amountInNaira: totalAmountToPay,
    userID: user._id,
    userWallet: walletWeb3?.address || '',
  });

  await data.save();

  if (paymentMethod === 'card' && wallet.Card?.data) {
    // Charge the saved card
    try {
      const chargeResponse: any = await chargeCardService(
        wallet.Card?.data,
        email,
        totalAmountToPay,
        {
          type: 'crypto_wallet_funding',
          original_amount: amount,
          charge: roundedCharge,
        }
      );
      if (chargeResponse.status === 'success') {
        return res.status(StatusCodes.OK).json({
          message: 'Payment successful',
          amount,
          charge: roundedCharge,
          totalAmountPaid: totalAmountToPay,
        });
      } else {
        throw new BadRequestError('Card charge failed');
      }
    } catch (error) {
      console.error('Error charging stored card:', error);
      throw new BadRequestError('Error charging stored card');
    }
  } else if (paymentMethod === 'card' && !wallet.Card?.data) {
    throw new BadRequestError('No card on file. Please use Paystack option.');
  } else {
    try {
      const response: any = await axios.post(
        'https://api.paystack.co/transaction/initialize',
        {
          email,
          amount: totalAmountToPay * 100, // Paystack expects amount in kobo
          callback_url: '',
          metadata: {
            type: 'crypto_wallet_funding',
            original_amount: amount,
            charge: roundedCharge,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${secret}`,
          },
        }
      );

      return res.status(StatusCodes.OK).json({
        message: 'Payment initiated successfully',
        paymentUrl: response.data.data.authorization_url,
        amount,
        charge: roundedCharge,
        totalAmountToPay,
      });
    } catch (error: any) {
      console.error(error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: 'Failed to initiate payment',
        error: error.response ? error.response.data : error.message,
      });
    }
  }
};
