import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
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
          crypto: crypto,
          network: network,
        }
      );
      if (chargeResponse.status === 'success') {
        return chargeResponse;
      } else {
        throw new Error('Card charge failed');
      }
    } catch (error) {
      console.error('Error charging stored card:', error);
    }
  } else if (paymentMethod === 'card' && !wallet.Card?.data) {
    throw new Error('No card on file. Please use Paystack option.');
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
      if (response.status === 'true') {
        return response.data;
      } else {
        throw new Error('Failed to initialize Paystack transaction');
      }
    } catch (error) {
      console.error('Error initializing Paystack transaction:', error);
      throw new Error('Failed to initialize Paystack transaction');
    }
  }
};

export const verifyCryptoPaymentService = async (reference: string) => {
  if (!reference) {
    throw new Error('Payment reference is required');
  }

  const isRefExist = await findSingleWalletHistoryService({ ref: reference });
  if (isRefExist) {
    throw new Error('Payment already verified');
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
      const { amount, customer, metadata } = paymentData;
      const amountInNaira = amount / 100;
      const user = await findUser('email', customer.email);
      if (!user) {
        throw new Error('User not found');
      }

      const wallet = await findWalletService({ user: user._id });
      if (!wallet) {
        throw new Error('Wallet not found');
      }
      const walletWeb3 = await getUserWeb3Wallet(user._id as string);
      if (!walletWeb3) {
        throw new Error('Web3 wallet not found');
      }
      const chainCoopReference = uuidv4();
      // Record the PaystackCashwyre transaction
      const paystackCashwyreRecord: IPaystackCashwyre = new PaystackCashwyre({
        userEmail: customer.email,
        amountInNaira: amountInNaira,
        amountInCrypto: 0,
        transferStatus: TransferStatus.PENDING,
        transactionStatus: TransactionStatus.DEBITED,
        userID: user._id,
        userWallet: walletWeb3?.address || '',
        crypto: metadata.crypto,
        network: metadata.network,
        paystackReference: reference,
        chainCoopReference: chainCoopReference,
      });
      await paystackCashwyreRecord.save();

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
      throw new Error('Payment not successful');
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
    throw new Error('All fields are required for bank transfer');
  }

  try {
    const user = await findUser('email', userEmail);
    if (!user) {
      throw new Error('User not found');
    }

    const transaction = await PaystackCashwyre.findOne({ chainCoopReference });

    if (!transaction) {
      throw new Error('Transaction not found');
    }

    if (transaction.transactionStatus !== TransactionStatus.DEBITED) {
      throw new Error('Transaction not eligible for transfer');
    }

    if (transaction.transferStatus === TransferStatus.SUCCESS) {
      throw new Error('Transfer already completed for this transaction');
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
      throw new Error('Invalid bank account details');
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
      throw new Error('Failed to create transfer recipient');
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
      throw new Error('Transfer initiation failed');
    }

    transaction.recipientCode =
      accountRecipientResponse.data.data.recipient_code;
    transaction.cashwyreAcc = cashWyreAccountNumber;
    transaction.cashwyreReference = cashWyrReference;
    transaction.cashwyreStatus = CashwyreTransactionStatus.PROCESSING;
    await transaction.save();

    return response.data.data;
  } catch (error) {
    console.error('Error in transferToBankService:', error);
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

  if (status === 'success') {
    transaction.transferStatus = TransferStatus.SUCCESS;
    transaction.transactionStatus = TransactionStatus.TRANSFERRED;
  } else if (status === 'failed') {
    transaction.transferStatus = TransferStatus.FAILED;
    transaction.transactionStatus = TransactionStatus.FAILED;
  } else if (status === 'reversed') {
    transaction.transferStatus = TransferStatus.REVERSED;
    transaction.transactionStatus = TransactionStatus.FAILED;
  } else {
    throw new Error('Invalid status value');
  }
};

const payStackCashWyreTransaction = async (reference: string) => {
  const verifyCryptoPayment = await verifyCryptoPaymentService(reference);
  return verifyCryptoPayment;

  const transactionDetails = await PaystackCashwyre.findOne({
    chainCoopReference: reference,
  });
  return transactionDetails;

  if (!transactionDetails) {
    throw new Error('Transaction not found');
  }

  const onrampQuoteResponse = await CashwyreServices.getOnrampQuote(
    transactionDetails?.amountInNaira || 0,
    transactionDetails?.crypto || '',
    transactionDetails?.network || '',
    transactionDetails?.chainCoopReference || ''
  );

  return onrampQuoteResponse;

  const confirmQuoteResponse = await CashwyreServices.confirmOnrampQuote(
    onrampQuoteResponse.reference || '',
    onrampQuoteResponse.transactionReference || '',
    transactionDetails?.userWallet || ''
  );
  return confirmQuoteResponse;

  const transferReponse = await transferToBankService(
    transactionDetails?.amountInNaira || 0,
    transactionDetails?.userID || '',
    transactionDetails?.userEmail || '',
    confirmQuoteResponse.accountNumber || '',
    confirmQuoteResponse.transactionReference || '',
    transactionDetails?.chainCoopReference || ''
  );
  return transferReponse;
};
