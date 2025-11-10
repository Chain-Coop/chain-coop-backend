import {
  Onramp,
  TransactionStatus,
  CryptoType,
  CryptoNetwork,
} from '../../../models/web3/onramp';
import CashwyreServices from '../Cashwyre/cashWyre';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';
import User from '../../../models/authModel';
import Wallet from '../../../models/wallet';
import { getUserWeb3Wallet } from '../accountService';
import { transferStable } from '../accountService';
import { tokenAddress } from '../../../utils/web3/tokenaddress';
import walletHistory from '../../../models/walletHistory';

interface CashwyreRates {
  success: boolean;
  message: string;
  data: {
    cryptoAssetInfo: {
      currency: string;
      symbol: string;
      rate: number;
    };
    currencyInfo: {
      currency: string;
      symbol: string;
      rate: number;
    };
  };
}

export const createOnrampTransaction = async (
  userId: string,
  amountInNaira: number,
  cryptoType: CryptoType,
  cryptoNetwork: CryptoNetwork
) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }
  const web3Wallet = await getUserWeb3Wallet(userId);
  if (!web3Wallet) {
    throw new Error('User wallet not found');
  }
  const wallet = await Wallet.findOne({ user: userId });
  if (!wallet) {
    throw new Error('User wallet not found');
  }
  if (amountInNaira <= 0) {
    throw new Error('Amount in Naira must be greater than zero.');
  }
  if (amountInNaira < 100) {
    throw new Error('Minimum amount is ₦100');
  }
  if (amountInNaira > 10000000) {
    throw new Error('Maximum amount is ₦10,000,000');
  }
  try {
    const requestId = uuidv4();
    const crypto = cryptoType === CryptoType.USDT ? 'usdt' : 'usd-coin';
    const cashWyreRate = (await CashwyreServices.getCryptoRate(
      requestId,
      crypto
    )) as CashwyreRates;
    if (!cashWyreRate.success) {
      throw new Error('Failed to fetch exchange rate from Cashwyre');
    }

    const exchangeRate = cashWyreRate.data.currencyInfo.rate;

    const session = await mongoose.startSession();
    session.startTransaction();

    const onrampTransaction = new Onramp({
      userId: user._id,
      amountInNaira,
      amountInCrypto: amountInNaira / exchangeRate,
      cryptoType,
      cryptoNetwork,
      transactionStatus: TransactionStatus.PENDING,
      exchangeRate,
      transactionId: requestId,
      walletAddress: web3Wallet.address, // Replace with actual wallet address
    });

    await onrampTransaction.save({ session });
    if (wallet.balance >= amountInNaira) {
      wallet.balance -= amountInNaira;
      await wallet.save({ session });
      onrampTransaction.transactionStatus = TransactionStatus.PAID;
      await onrampTransaction.save({ session });
      const historyEntry = new walletHistory({
        amount: amountInNaira,
        label: 'Onramp to crypto wallet',
        type: 'debit',
        ref: onrampTransaction.transactionId,
        user: user._id,
      });
      await historyEntry.save({ session });
    } else {
      throw new Error('Insufficient wallet balance for onramp transaction.');
    }

    await session.commitTransaction();
    session.endSession();

    return onrampTransaction;
  } catch (error) {
    console.error('Error creating onramp transaction:', error);
    throw new Error('Failed to create onramp transaction.');
  }
};

export const transferToCryptoWallet = async (onrampTransactionId: string) => {
  const onrampTransaction = await Onramp.findOne({
    transactionId: onrampTransactionId,
  });
  if (!onrampTransaction) {
    throw new Error('Onramp transaction not found');
  }
  if (onrampTransaction.transactionStatus === TransactionStatus.COMPLETED) {
    console.log('Onramp transaction already completed');
    return onrampTransaction;
  }

  if (onrampTransaction.transactionStatus !== TransactionStatus.PAID) {
    throw new Error('Onramp transaction is not paid yet');
  }

  const tokenIdNum = onrampTransaction.cryptoType === CryptoType.USDT ? 1 : 2;
  const tokenAddressToSaveWith = tokenAddress(
    tokenIdNum,
    onrampTransaction.cryptoNetwork.toUpperCase()
  );
  try {
    onrampTransaction.transactionStatus = TransactionStatus.PROCESSING;
    await onrampTransaction.save();
    const transferResult = await transferStable(
      process.env.RELAYER_PRIVATE_KEY || '',
      onrampTransaction.amountInCrypto.toString(),
      onrampTransaction.walletAddress,
      tokenAddressToSaveWith,
      onrampTransaction.cryptoNetwork.toUpperCase()
    );
    onrampTransaction.transactionHash = transferResult;
    onrampTransaction.transactionStatus = TransactionStatus.COMPLETED;
    await onrampTransaction.save();
    return onrampTransaction;
  } catch (error) {
    console.error('Error processing onramp transaction:', error);
    onrampTransaction.transactionStatus = TransactionStatus.FAILED;
    onrampTransaction.failureReason =
      error instanceof Error ? error.message : 'Unknown error';
    await onrampTransaction.save();
    try {
      await refundWalletOnramp(onrampTransactionId);
      return onrampTransaction;
    } catch (error) {
      console.error('Error refunding onramp transaction after failure:', error);
      throw new Error('Failed to process onramp transaction and refund.');
    }
  }
};

export const refundWalletOnramp = async (onrampTransactionId: string) => {
  const onrampTransaction = await Onramp.findOne({
    transactionId: onrampTransactionId,
  });
  if (!onrampTransaction) {
    throw new Error('Onramp transaction not found');
  }
  if (onrampTransaction.transactionStatus === TransactionStatus.REFUNDED) {
    console.log('Onramp transaction already refunded');
    return onrampTransaction;
  }
  if (onrampTransaction.transactionStatus !== TransactionStatus.FAILED) {
    throw new Error('Only failed onramp transactions can be refunded');
  }

  try {
    const wallet = await Wallet.findOne({ user: onrampTransaction.userId });
    if (!wallet) {
      throw new Error('User wallet not found for refund');
    }
    wallet.balance += onrampTransaction.amountInNaira;
    await wallet.save();
    const historyEntry = new walletHistory({
      amount: onrampTransaction.amountInNaira,
      label: 'Refund for failed onramp to crypto wallet',
      type: 'credit',
      ref: onrampTransaction.transactionId,
      user: onrampTransaction.userId,
    });
    await historyEntry.save();
    onrampTransaction.transactionStatus = TransactionStatus.REFUNDED;
    await onrampTransaction.save();
    return onrampTransaction;
  } catch (error) {
    console.error('Error refunding onramp transaction:', error);
    throw new Error('Failed to refund onramp transaction.');
  }
};

export const getUserOnrampTransactions = async (userId: string) => {
  const transactions = await Onramp.find({ userId }).sort({ createdAt: -1 });
  return transactions;
};

export const getOnrampTransactionById = async (transactionId: string) => {
  const transaction = await Onramp.findOne({ transactionId });
  return transaction;
};
