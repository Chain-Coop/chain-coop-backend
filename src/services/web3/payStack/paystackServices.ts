import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import mongoose from 'mongoose';
import { findUser } from '../../authService';
import {
  createWalletHistoryService,
  findWalletService,
  updateWalletService,
  findSingleWalletHistoryService,
  iWalletHistory,
  chargeCardService,
} from '../../walletService';
import {
  PaystackCashwyre,
  TransferStatus,
  TransactionStatus,
  IPaystackCashwyre,
} from '../../../models/web3/paystackCashwyre';
import { CashwyreTransactionStatus } from '../../../models/web3/cashWyreTransactions';
import { getUserWeb3Wallet } from '../accountService';
import Wallet from '../../../models/wallet';
import CashwyreServices from '../Cashwyre/cashWyre';

const secret = process.env.PAYSTACK_SECRET_KEY!;

export const initializeCryptoPaymentService = async (
  amount: number,
  email: string,
  paymentMethod: string,
  crypto: string,
  network: string
) => {
  if (!amount || !email) {
    throw new Error('Amount and email are required');
  }

  const user = await findUser('email', email);
  if (!user) {
    throw new Error('User not found');
  }

  const wallet = await findWalletService({ user: user._id });
  if (!wallet) {
    throw new Error('Wallet not found');
  }

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
    throw new Error('Invalid payment method');
  }

  if (paymentMethod === 'card' && wallet.Card?.data) {
    const chargeResponse: any = await chargeCardService(
      wallet.Card?.data,
      email,
      totalAmountToPay,
      {
        type: 'crypto_wallet_funding',
        original_amount: amount,
        charge: roundedCharge,
        crypto: crypto,
        network: network,
      }
    );
    if (chargeResponse.status !== 'success') {
      throw new Error('Card charge failed');
    }
    return chargeResponse;
  } else if (paymentMethod === 'card' && !wallet.Card?.data) {
    throw new Error('No card on file. Please use Paystack option.');
  }

  const response: any = await axios.post(
    'https://api.paystack.co/transaction/initialize',
    {
      email,
      amount: totalAmountToPay * 100,
      callback_url: '',
      metadata: {
        type: 'crypto_wallet_funding',
        original_amount: amount,
        charge: roundedCharge,
        crypto: crypto,
        network: network,
      },
    },
    {
      headers: {
        Authorization: `Bearer ${secret}`,
      },
    }
  );

  if (response.data.status !== true) {
    throw new Error('Failed to initialize Paystack transaction');
  }

  return response.data;
};

export const verifyCryptoPaymentService = async (reference: string) => {
  if (!reference) {
    throw new Error('Payment reference is required');
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Check for duplicate with session lock
    const isRefExist = await findSingleWalletHistoryService({ ref: reference });
    if (isRefExist) {
      await session.abortTransaction();
      throw new Error('Payment already verified');
    }

    const response: any = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const paymentData = response.data.data;
    if (paymentData.status !== 'success') {
      await session.abortTransaction();
      throw new Error('Payment not successful');
    }

    const { amount, customer } = paymentData;
    const amountInNaira = amount / 100;

    const user = await findUser('email', customer.email);
    if (!user) {
      await session.abortTransaction();
      throw new Error('User not found');
    }

    const wallet = await findWalletService({ user: user._id });
    if (!wallet) {
      await session.abortTransaction();
      throw new Error('Wallet not found');
    }

    const walletWeb3 = await getUserWeb3Wallet(user._id as string);
    if (!walletWeb3) {
      await session.abortTransaction();
      throw new Error('Web3 wallet not found');
    }

    // Update wallet balance
    const updatedWallet = await updateWalletService(wallet._id, {
      balance: wallet.balance + amountInNaira,
    });

    // Save card authorization if not already saved
    if (!wallet.Card?.data) {
      wallet.Card = {
        data: paymentData.authorization.authorization_code,
        failedAttempts: 0,
      };
      wallet.markModified('Card');
      await wallet.save({ session });
    }

    const historyPayload: iWalletHistory = {
      amount: amountInNaira,
      label: 'Wallet top up via Paystack for Crypto',
      ref: reference,
      type: 'credit',
      user: user._id as string,
    };
    await createWalletHistoryService(historyPayload);

    await session.commitTransaction();
    return updatedWallet;
  } catch (error: any) {
    await session.abortTransaction();
    console.error('Error verifying payment:', error.message);
    throw error;
  } finally {
    session.endSession();
  }
};

export const transferToBankService = async (
  userId: string,
  amountInNaira?: number,
  crypto?: string,
  network?: string
) => {
  if (!userId || !amountInNaira || !crypto || !network) {
    throw new Error(
      'userid,amountinNaira,crypto,network are neccessary for transfer'
    );
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = await findUser('id', userId);
    if (!user) {
      throw new Error('User not found');
    }

    const walletWeb3 = await getUserWeb3Wallet(user._id as string);
    if (!walletWeb3) {
      throw new Error('Web3 wallet not found');
    }

    const wallet = await findWalletService({ user: user._id });
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    // Check for duplicate recent transactions (idempotency)
    const recentTransaction = await PaystackCashwyre.findOne({
      userID: user._id,
      amountInNaira,
      crypto,
      network,
      createdAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) }, // Last 5 minutes
      transferStatus: {
        $in: [TransferStatus.PENDING, TransferStatus.SUCCESS],
      },
    }).session(session);

    if (recentTransaction) {
      throw new Error(
        'Duplicate transaction detected. Please wait before retrying.'
      );
    }

    const transaction = new PaystackCashwyre({
      userEmail: user.email,
      amountInNaira: amountInNaira,
      amountInCrypto: 0,
      amountDebited: 0,
      transferStatus: TransferStatus.PENDING,
      transactionStatus: TransactionStatus.SUFFICIENT,
      userID: user._id,
      userWallet: walletWeb3?.address || '',
      crypto: crypto,
      network: network,
      paystackReference: '',
      chainCoopReference: uuidv4(),
    });
    await transaction.save({ session });

    // Get quote from Cashwyre
    const quote = await CashwyreServices.getOnrampQuote(
      transaction.amountInNaira,
      transaction.crypto,
      transaction.network,
      transaction.chainCoopReference
    );

    if (!quote) {
      throw new Error('Failed to get quote from Cashwyre');
    }

    const {
      amountInCryptoAsset,
      transactionReference,
      reference: quoteRef,
    } = quote.data;
    transaction.cashwyreReference = transactionReference;
    transaction.amountInCrypto = amountInCryptoAsset;
    await transaction.save({ session });

    // Confirm quote with Cashwyre
    const confirmQuote = await CashwyreServices.confirmOnrampQuote(
      quoteRef,
      transactionReference,
      transaction.userWallet
    );

    if (!confirmQuote) {
      throw new Error('Failed to confirm quote with Cashwyre');
    }

    const { accountNumber, totalDepositInLocalCurrency } = confirmQuote.data;
    transaction.amountDebited = totalDepositInLocalCurrency;
    transaction.cashwyreAcc = accountNumber;
    await transaction.save({ session });

    // Check wallet balance
    if (transaction.amountDebited > wallet.balance) {
      throw new Error('Insufficient wallet balance for transfer');
    }

    // Validate bank account
    const accountValidationResponse: any = await axios.get(
      `https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=50515`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    if (!accountValidationResponse.data.status) {
      throw new Error('Invalid bank account details');
    }

    // Create transfer recipient
    const accountRecipientResponse: any = await axios.post(
      `https://api.paystack.co/transferrecipient`,
      {
        type: 'nuban',
        name: accountValidationResponse.data.data.account_name,
        account_number: accountValidationResponse.data.data.account_number,
        bank_code: '50515',
        currency: 'NGN',
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    if (!accountRecipientResponse.data.status) {
      throw new Error('Failed to create transfer recipient');
    }

    // Initiate transfer
    const transferPayload = {
      source: 'balance',
      amount: totalDepositInLocalCurrency * 100,
      recipient: accountRecipientResponse.data.data.recipient_code,
      reference: transaction.chainCoopReference,
      reason: `Transfer to Cashwyre account ${transaction.cashwyreReference}`,
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
      throw new Error('Transfer initiation failed');
    }

    // Deduct from wallet balance
    await updateWalletService(wallet._id, {
      balance: wallet.balance - transaction.amountDebited,
    });

    // Create wallet history for debit
    const historyPayload: iWalletHistory = {
      amount: transaction.amountDebited,
      label: `Crypto purchase: ${transaction.crypto} on ${transaction.network}`,
      ref: transaction.chainCoopReference,
      type: 'debit',
      user: user._id as string,
    };
    await createWalletHistoryService(historyPayload);

    // Update transaction record
    transaction.recipientCode =
      accountRecipientResponse.data.data.recipient_code;
    transaction.cashwyreStatus = CashwyreTransactionStatus.PROCESSING;
    await transaction.save({ session });

    await session.commitTransaction();
    return transaction;
  } catch (error: any) {
    await session.abortTransaction();
    console.error('Error in transferToBankService:', error);
    throw error;
  } finally {
    session.endSession();
  }
};

export const verifyTransferService = async (
  reference: string,
  status: string
) => {
  if (!reference || !status) {
    throw new Error('Reference and status are required');
  }

  const transaction = await PaystackCashwyre.findOne({
    chainCoopReference: reference,
  });

  if (!transaction) {
    throw new Error('Transaction not found');
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (status === 'success') {
      transaction.transferStatus = TransferStatus.SUCCESS;
      transaction.transactionStatus = TransactionStatus.TRANSFERRED;
    } else if (status === 'failed' || status === 'reversed') {
      transaction.transferStatus =
        status === 'failed' ? TransferStatus.FAILED : TransferStatus.REVERSED;
      transaction.transactionStatus = TransactionStatus.FAILED;

      // Refund wallet on failure/reversal
      const user = await findUser('id', transaction.userID.toString());
      if (user) {
        const wallet = await findWalletService({ user: user._id });
        if (wallet) {
          await updateWalletService(wallet._id, {
            balance: wallet.balance + transaction.amountDebited,
          });

          // Create refund history
          const historyPayload: iWalletHistory = {
            amount: transaction.amountDebited,
            label: `Refund: Failed crypto transfer - ${transaction.chainCoopReference}`,
            ref: `refund-${transaction.chainCoopReference}`,
            type: 'credit',
            user: user._id as string,
          };
          await createWalletHistoryService(historyPayload);
        }
      }
    } else {
      throw new Error('Invalid status value');
    }

    await transaction.save({ session });
    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

export const handleCashwyreWebhook = async (
  reference: string,
  status: CashwyreTransactionStatus
) => {
  if (!reference) {
    throw new Error('Reference is required');
  }

  const transaction = await PaystackCashwyre.findOne({
    chainCoopReference: reference,
  });

  if (!transaction) {
    throw new Error('Transaction not found');
  }

  transaction.cashwyreStatus = status;
  transaction.transactionStatus =
    status === CashwyreTransactionStatus.SUCCESS
      ? TransactionStatus.CREDITED
      : TransactionStatus.FAILED;

  await transaction.save();

  return transaction;
};