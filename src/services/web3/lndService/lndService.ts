import { Types } from 'mongoose';
import Invoice, { IInvoice } from '../../../models/web3/lnd/invoice';
import Payment, { IPayment } from '../../../models/web3/lnd/payment';
import LndWallet from '../../../models/web3/lnd/wallet';
import { v4 as uuidv4 } from 'uuid';
import {
  AddInvoice,
  decodeInvoice,
  PayInvoice,
} from '../../../utils/web3/lnd';

export const getInvoiceById = async (invoiceId: string) => {
  return await Invoice.findOne({ invoiceId });
};

export const getInvoicesByUser = async (userId: string) => {
  return await Invoice.find({ userId }).sort({ createdAt: -1 });
};

export const createInvoice = async (payload: Partial<IInvoice>) => {
  try {
    const invoice = await Invoice.create(payload);
    return invoice;
  } catch (err: any) {
    console.error('Error creating invoice:', err);
    throw new Error(err.message || 'Failed to create invoice');
  }
};

export const createPayment = async (payload: Partial<IPayment>) => {
  try {
    const payment = await Payment.create(payload);
    return payment;
  } catch (err: any) {
    console.error('Error sending payment:', err);
    throw new Error(err.message || 'Error sending payment');
  }
};

export const getWalletBalance = async (userId: string) => {
  try {
    const wallet = await LndWallet.findById(userId);
    return wallet?.balance || 0;
  } catch (error: any) {
    console.error('Error fetcing balnce:', error);
    throw new Error(error.message || 'Error fetcing balance');
  }
};

export const decrementBalance = async (
  userId: Types.ObjectId | string,
  amount: number
) => {
  return await LndWallet.findByIdAndUpdate(
    userId,
    { $inc: { balance: -amount } },
    {
      new: true,
      runValidators: true,
    }
  );
};

export const incrementBalance = async (
  userId: Types.ObjectId | string,
  amount: number
) => {
  return await LndWallet.findByIdAndUpdate(
    userId,
    { $inc: { balance: amount } },
    {
      new: true,
      runValidators: true,
    }
  );
};

// Lock funds for a specific period
export const lockBalance = async (
  userId: string,
  amount: number,
  maturitDate: Date,
  purpose: string = 'staking'
) => {
  try {
    const wallet = await LndWallet.findOne({ userId });
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    const availableBalance = wallet.balance - wallet.lockedBalance;
    if (availableBalance < amount) {
      throw new Error('Insufficient available balance to lock');
    }

    const lockId = uuidv4();
    const lockEntry = {
      amount,
      lockedAt: new Date(),
      maturitDate,
      purpose,
      lockId,
    };

    const updatedWallet = await LndWallet.findOneAndUpdate(
      { userId },
      {
        lockedBalance: amount, // Set to the new lock amount
        lock: lockEntry, // Set the single lock entry
      },
      { new: true, runValidators: true }
    );

    if (!updatedWallet) {
      throw new Error('Failed to update wallet');
    }

    return { wallet: updatedWallet, lockId };
  } catch (error: any) {
    console.error('Error locking balance:', error);
    throw new Error(error.message || 'Failed to lock balance');
  }
};

// Unlock expired funds automatically
export const unlockExpiredFunds = async (userId: string) => {
  try {
    const now = new Date();
    const wallet = await LndWallet.findOne({ userId });

    if (!wallet || !wallet.lock) {
      return { unlockedAmount: 0, expiredLock: null, wallet };
    }

    // Check if the single lock is expired
    if (wallet.lock.maturityDate <= now) {
      const expiredLock = wallet.lock;

      const updatedWallet = await LndWallet.findOneAndUpdate(
        { userId },
        {
          lockedBalance: 0,
          $unset: { lock: '' },
        },
        { new: true }
      );

      if (!updatedWallet) {
        throw new Error('Failed to update wallet');
      }

      return {
        unlockedAmount: expiredLock.amount,
        expiredLock,
        wallet: updatedWallet,
      };
    }

    return { unlockedAmount: 0, expiredLock: null, wallet };
  } catch (error: any) {
    console.error('Error unlocking expired funds:', error);
    throw new Error(error.message || 'Failed to unlock expired funds');
  }
};

// Manually unlock the current lock
export const unlockCurrentFunds = async (userId: string) => {
  try {
    const wallet = await LndWallet.findOne({ userId });
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    if (!wallet.lock) {
      throw new Error('No active lock found');
    }

    const lockAmount = wallet.lock.amount;

    const updatedWallet = await LndWallet.findOneAndUpdate(
      { userId },
      {
        lockedBalance: 0,
        $unset: { lock: '' }, // Remove the lock field
      },
      { new: true }
    );

    if (!updatedWallet) {
      throw new Error('Failed to update wallet');
    }

    return { unlockedAmount: lockAmount, wallet: updatedWallet };
  } catch (error: any) {
    console.error('Error unlocking current funds:', error);
    throw new Error(error.message || 'Failed to unlock funds');
  }
};

// Get available balance (total - locked)
export const getAvailableBalance = async (userId: string) => {
  try {
    // First unlock any expired funds
    await unlockExpiredFunds(userId);

    const wallet = await LndWallet.findOne({ userId });
    if (!wallet) {
      return 0;
    }

    return wallet.balance - wallet.lockedBalance;
  } catch (error: any) {
    console.error('Error getting available balance:', error);
    throw new Error(error.message || 'Error fetching available balance');
  }
};

// Get wallet details including lock
export const getWalletDetails = async (userId: string) => {
  try {
    // First unlock any expired funds
    await unlockExpiredFunds(userId);

    const wallet = await LndWallet.findOne({ userId }).lean();
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    return {
      totalBalance: wallet.balance,
      lockedBalance: wallet.lockedBalance,
      availableBalance: wallet.balance - wallet.lockedBalance,
      activeLock: wallet.lock || null,
      hasActiveLock: !!wallet.lock,
    };
  } catch (error: any) {
    console.error('Error getting wallet details:', error);
    throw new Error(error.message || 'Error fetching wallet details');
  }
};
export const sendPayment = async (userId: string, invoice: string) => {
  try {
    const decoded = await decodeInvoice(invoice);
    if (!decoded) {
      throw new Error('Invalid invoice format');
    }
    const payment_request = decoded.payment_request;
    const timeout_seconds = decoded.timeExpireDate;

    const amountSat = decoded.satoshis ? Number(decoded.satoshis) : 0;

    const senderBalance = await getAvailableBalance(userId);
    const estimatedFee = Math.ceil(Number(amountSat) * 0.01); // Estimate 1% fee
    const totalRequired = Number(amountSat) + estimatedFee;

    if (senderBalance < totalRequired) {
      throw new Error('Insufficient balance for payment');
    }
    const createdAt = decoded.creation_date;
    const expiresAt = Number(createdAt) + timeout_seconds;
    const now = Math.floor(Date.now() / 1000);
    if (expiresAt < now) {
      throw new Error('Invoice has expired');
    }
    if (amountSat <= 0) {
      throw new Error('Payment amount must be greater than zero');
    }
    await decrementBalance(userId, amountSat);
    const request = {
      payment_request: payment_request,
      timeout_seconds,
      fee_limit_sat: estimatedFee,
    };
    const response = await PayInvoice(request);
    const payload: Partial<IPayment> = {
      userId: new Types.ObjectId(userId),
      paymentId: response.payment_hash,
      bolt11: payment_request,
      amount: Number(response.value),
      fee: Number(response.fee),
      payment_index: Number(response.payment_index),
      preimage: response.payment_preimage,
      status: response.status.toLowerCase() as IPayment['status'],
      failureReason: response.failure_reason,
      paymentHash: response.payment_hash,
      destination: decoded.fallback_addr || '',
      hops: response.htlcs?.length,
      succeededAt: response.status === 'SUCCEEDED' ? new Date() : undefined,
      failedAt: response.status === 'FAILED' ? new Date() : undefined,
      routingHints: response.htlcs,
      metadata: {
        route: response.htlcs,
        payment_error: response.failure_reason,
      },
    };
    if (response.status === 'FAILED') {
      await incrementBalance(userId, amountSat);
    }
    const payment = await createPayment(payload);
    return payment;
  } catch (error: any) {
    console.error('Error sending payment:', error);
    throw new Error(error.message || 'Failed to send payment');
  }
};
export const createLndInvoice = async (
  userId: any,
  amount: number,
  memo: string
) => {
  try {
    const invoiceRequest = {
      value: amount.toString(), // Ensure it's a string
      memo: memo || '',
      expiry: 3600, // 1 hour in seconds, not milliseconds
    };

    const invoiceResponse = await AddInvoice(invoiceRequest);
    if (!invoiceResponse.payment_request) {
      throw new Error('Invalid response from LND: missing payment_request');
    }

    if (!invoiceResponse.r_hash) {
      throw new Error('Invalid response from LND: missing r_hash');
    }
    const paymentHashHex = Buffer.from(
      invoiceResponse.r_hash,
      'base64'
    ).toString('hex'); // using invoiceResponse.r_hash.toString('hex') is throwing error

    // Prepare payload with validated data
    const payload: Partial<IInvoice> = {
      userId: userId,
      invoiceId: invoiceResponse.add_index?.toString() || Date.now().toString(),
      bolt11: invoiceResponse.payment_request,
      amount: amount,
      memo: memo || '',
      expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
      paymentHash: paymentHashHex,
      payment_request: invoiceResponse.payment_request,
      status: 'pending',
    };
    const data = await createInvoice(payload);
    return data;
  } catch (error: any) {
    console.error('Error creating LND invoice:', error);
    throw new Error(error.message || 'Failed to create LND invoice');
  }
};
