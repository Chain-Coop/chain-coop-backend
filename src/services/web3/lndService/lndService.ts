import { Types } from 'mongoose';
import Invoice, { IInvoice } from '../../../models/web3/lnd/invoice';
import Payment, { IPayment } from '../../../models/web3/lnd/payment';
import LndWallet from '../../../models/web3/lnd/wallet';
import { v4 as uuidv4 } from 'uuid';
import {
  decodeInvoice,
  PayInvoice,
  PaymentInvoice,
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
    const timeout_seconds = decoded.expiry;
    const amountMsat = decoded.value_msat;
    const amountSat = decoded.value ? Number(decoded.value) : 0;

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

// // Deduct from user balance (for outgoing payments)
// export const decrementUserBalance = async (userId: string, amount: number) => {
//     const user = await User.findById(userId);
//     if (!user || (user.lightningBalance || 0) < amount) {
//         throw new Error('Insufficient balance');
//     }

//     return await User.findByIdAndUpdate(
//         userId,
//         { $inc: { lightningBalance: -amount } },
//         {
//             new: true,
//             runValidators: true,
//         }
//     );
// }

// interface LndRoute {
//   fee: number;
//   fee_mtokens: string;
//   hops: Array<{
//     channel: string;
//     channel_capacity: number;
//     fee: number;
//     fee_mtokens: string;
//     forward: number;
//     forward_mtokens: string;
//     public_key: string;
//     timeout: number;
//   }>;
//   mtokens: string;
//   payment: number;
//   timeout: number;
// }

// export const getWallet = async () => {
//   try {
//     console.log('LND instance:', lnd);
//     const walletInfo = await getWalletInfo({ lnd });
//     return walletInfo;
//   } catch (error) {
//     console.error('Error getting wallet info:', error);
//     throw error;
//   }
// };

// export const createAddress = async () => {
//   try {
//     const address = await createChainAddress({ format: 'p2wpkh', lnd });
//     return address;
//   } catch (error) {
//     console.error('Error creating address:', error);
//     throw error;
//   }
// };

// export const createLndInvoice = async (amount: number, memo: string) => {
//   try {
//     if (isNaN(amount) || amount <= 0) {
//       throw new Error('Invalid amount: must be a positive number');
//     }

//     const invoice = await createInvoice({
//       lnd,
//       tokens: amount,
//       description: memo,
//     });
//     return invoice;
//   } catch (error) {
//     console.error('Error creating invoice:', error);
//     throw error;
//   }
// };
// export const getLndInvoice = async (id: string) => {
//   try {
//     const invoice = await getInvoice({ id, lnd });
//     return invoice;
//   } catch (error) {
//     console.error('Error getting invoice:', error);
//     throw error;
//   }
// };
// export const subscribeToLndInvoice = async (id: string) => {
//   try {
//     const subscription = await subscribeToInvoice({ id, lnd });
//     return subscription;
//   } catch (error) {
//     console.error('Error subscribing to invoice:', error);
//     throw error;
//   }
// };
// export const payLndInvoice = async (invoice: string, route: LndRoute) => {
//   try {
//     const decoded = await decodeBolt11({ lnd, request: invoice });
//     const payment = await payViaRoutes({
//       lnd,
//       routes: [route],
//       id: decoded.id,
//     });
//     return payment;
//   } catch (error: any) {
//     // Better error categorization
//     if (error.message.includes('insufficient funds')) {
//       const enhancedError = new Error('Insufficient funds for payment');
//       enhancedError.name = 'INSUFFICIENT_FUNDS';
//       throw enhancedError;
//     }
//     if (error.message.includes('unable to route')) {
//       const enhancedError = new Error('Payment route not found');
//       enhancedError.name = 'ROUTE_NOT_FOUND';
//       throw enhancedError;
//     }
//     console.error('Error paying invoice:', error);
//     throw error;
//   }
// };

// export const decodeLndInvoice = async (invoice: string) => {
//   try {
//     const decoded = await decodeBolt11({ lnd, request: invoice });
//     return decoded;
//   } catch (error) {
//     console.error('Error decoding invoice:', error);
//     throw error;
//   }
// };
// export const probeLndRoute = async (
//   destination: string,
//   amount: number,
//   maxFee?: number
// ) => {
//   try {
//     const route = await probeForRoute({
//       lnd,
//       destination,
//       tokens: amount,
//       max_fee: maxFee || Math.floor(amount * 0.01), // Default to 1% fee limit
//     });
//     return route;
//   } catch (error) {
//     console.error('Error probing route:', error);
//     throw error;
//   }
// };

// export const getLndRoute = async (destination: string, amount: number) => {
//   try {
//     const route = await getRouteToDestination({
//       lnd,
//       destination,
//       tokens: amount,
//     });
//     return route;
//   } catch (error) {
//     console.error('Error getting route:', error);
//     throw error;
//   }
// };

// export const getLndChannels = async (limit = 100, offset = 0) => {
//   try {
//     const { channels } = await getChannels({ lnd });
//     // Apply pagination
//     const paginatedChannels = channels.slice(offset, offset + limit);
//     return {
//       channels: paginatedChannels,
//       total: channels.length,
//     };
//   } catch (error) {
//     console.error('Error getting channels:', error);
//     throw error;
//   }
// };
