import { Types } from 'mongoose';
import LndWallet from '../../../models/web3/lnd/wallet';
import { v4 as uuidv4 } from 'uuid';

export const getBitcoinBalance = async (userId: Types.ObjectId | string) => {
  const wallet = await LndWallet.findOne({ userId });
  if (!wallet) {
    throw new Error('Bitcoin wallet not found for this user');
  }
  return wallet.balance / 100000000; // Convert from satoshis to BTC
};

export const decrementBalance = async (
  userId: Types.ObjectId | string,
  amount: number
) => {
  return await LndWallet.findByIdAndUpdate(
    userId,
    { $inc: { balance: -amount * 100000000 } },
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
    { $inc: { balance: amount * 100000000 } },
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
    const parsedAmount = amount * 100000000; // Convert to satoshis

    const availableBalance = wallet.balance - wallet.lockedBalance;
    if (availableBalance < parsedAmount) {
      throw new Error('Insufficient available balance to lock');
    }

    const lockId = uuidv4();
    const lockEntry = {
      parsedAmount,
      lockedAt: new Date(),
      maturityDate,
      purpose,
      lockId,
    };
    const updatedWallet = await LndWallet.findOneAndUpdate(
      { userId },
      {
        $inc: { lockedBalance: parsedAmount, balance: -parsedAmount },
        $push: { lock: lockEntry }, // Add new lock entry
      },
      { new: true }
    );
    if (!updatedWallet) {
      throw new Error('Failed to update wallet');
    }
    return {
      lockedAmount: parsedAmount,
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
      unlockedAmount: totalUnlockedAmount / 100000000, // Convert to BTC
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

    return (wallet.balance - wallet.lockedBalance) / 100000000; // Convert from satoshis to BTC
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
      totalBalance: wallet.balance / 100000000, // Convert from satoshis to BTC
      lockedBalance: wallet.lockedBalance / 100000000, // Convert from satoshis to BTC
      availableBalance: (wallet.balance - wallet.lockedBalance) / 100000000, // Convert from satoshis to BTC
      activeLock:
        wallet.lock.map((lock) => {
          return {
            lockId: lock.lockId,
            amount: lock.amount / 100000000, // Convert from satoshis to BTC
            lockedAt: lock.lockedAt,
            maturityDate: lock.maturityDate,
            purpose: lock.purpose || 'staking',
          };
        }) || null,
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
      totalLockedBalance: wallet.lockedBalance / 100000000, // Convert from satoshis to BTC
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

    return {
      lockId: lockEntry.lockId,
      amount: lockEntry.amount / 100000000, // Convert from satoshis to BTC
      lockedAt: lockEntry.lockedAt,
      maturityDate: lockEntry.maturityDate,
      purpose: lockEntry.purpose || 'staking',
    };
  } catch (error: any) {
    console.error('Error getting lock details:', error);
    throw new Error(error.message || 'Error fetching lock details');
  }
};
