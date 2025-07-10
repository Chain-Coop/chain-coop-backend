import { Types } from 'mongoose';
import LndWallet from '../../../models/web3/lnd/wallet';
import { v4 as uuidv4 } from 'uuid';

export const getBitcoinBalance = async (userId: Types.ObjectId | string) => {
  const wallet = await LndWallet.findOne({ userId });
  if (!wallet) {
    throw new Error('Bitcoin wallet not found for this user');
  }
  return wallet.balance;
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
  const result = await LndWallet.findOneAndUpdate(
    { userId: userId },
    { $inc: { balance: amount } },
    {
      new: true,
      runValidators: true,
      upsert: true,
    }
  );

  return result;
};
// Lock funds for a specific period
export const lockBalance = async (
  userId: string,
  amount: number,
  maturityDate: Date,
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
      maturityDate,
      purpose,
      lockId,
    };
    const updatedWallet = await LndWallet.findOneAndUpdate(
      { userId },
      {
        $inc: { lockedBalance: amount, balance: -amount },
        $push: { lock: lockEntry }, // Add new lock entry
      },
      { new: true }
    );
    if (!updatedWallet) {
      throw new Error('Failed to update wallet');
    }
    return {
      lockedAmount: amount,
      lockId,
      lockEntry,
    };
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

    if (!wallet) {
      throw new Error('Wallet not found');
    }
    if (!wallet.lock || wallet.lock.length === 0) {
      return { unlockedAmount: 0, expiredLock: null, wallet };
    }

    // Filter locks that are expired
    const expiredLocks = wallet.lock.filter((lock) => lock.maturityDate < now);
    if (expiredLocks.length === 0) {
      return { unlockedAmount: 0, expiredLock: null, wallet };
    }
    // Calculate total amount to unlock
    const totalUnlockedAmount = expiredLocks.reduce(
      (sum, lock) => sum + lock.amount,
      0
    );
    // Remove expired locks from the wallet
    const updatedWallet = await LndWallet.findOneAndUpdate(
      { userId },
      {
        $inc: {
          lockedBalance: -totalUnlockedAmount,
          balance: totalUnlockedAmount,
        },
        $pull: {
          lock: { lockId: { $in: expiredLocks.map((lock) => lock.lockId) } },
        }, // Remove expired locks
      },
      { new: true }
    );
    if (!updatedWallet) {
      throw new Error('Failed to update wallet');
    }
    return {
      unlockedAmount: totalUnlockedAmount,
      expiredLock: expiredLocks,
      wallet: updatedWallet,
    };
  } catch (error: any) {
    console.error('Error unlocking expired funds:', error);
    throw new Error(error.message || 'Failed to unlock expired funds');
  }
};

// Get available balance (total - locked)
export const getAvailableBalance = async (userId: string) => {
  try {
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
    const wallet = await LndWallet.findOne({ userId });
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

export const getBitcoinLockStatus = async (userId: string) => {
  try {
    const wallet = await LndWallet.findOne({ userId });
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    return {
      hasActiveLock: wallet.lock && wallet.lock.length > 0,
      activeLock: wallet.lock || [],
      totalLockedBalance: wallet.lockedBalance,
    };
  } catch (error: any) {
    console.error('Error getting lock status:', error);
    throw new Error(error.message || 'Error fetching lock status');
  }
};

export const getLockDetails = async (userId: string, lockId: string) => {
  try {
    const wallet = await LndWallet.findOne({ userId });
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    const lockEntry = wallet.lock.find((lock) => lock.lockId === lockId);
    if (!lockEntry) {
      throw new Error('Lock entry not found');
    }

    return lockEntry;
  } catch (error: any) {
    console.error('Error getting lock details:', error);
    throw new Error(error.message || 'Error fetching lock details');
  }
};
