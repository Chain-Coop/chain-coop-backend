import AsyncHandler from 'express-async-handler';
import { Request, Response } from 'express';
import {
  activateAccount,
  checkStableUserBalance,
  checkExistingWallet,
  getUserWeb3Wallet,
  createUserBitcoinWallet,
  getBitcoinAddress,
  checkExistingBitcoinWallet,
  transferStable,
  transferBitcoin,
  lockBitcoinAmount,
  unlockBitcoinAmount,
  getBitcoinBalanceDetails,
  validateBitcoinAddress,
  getBitcoinLockStatus,
} from '../../services/web3/accountService';
import Web3Wallet, { Web3WalletDocument } from '../../models/web3Wallet';
import { decrypt } from '../../services/encryption';
import { tokenAddress } from '../../utils/web3/tokenaddress';
import { StatusCodes } from 'http-status-codes';
import { bitcoin } from 'bitcoinjs-lib/src/networks';

const activateWeb3Wallet = AsyncHandler(async (req: Request, res: Response) => {
  //@ts-ignore
  const userId = req.user.userId;
  try {
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    const exists = await checkExistingWallet(userId);
    if (exists) {
      res.status(400).json({ message: 'Wallet Already Activated' });
      return;
    }
    await activateAccount(userId);
    res.json({ message: 'Account activated successfully' });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});
const activateBitcoinWallet = AsyncHandler(
  async (req: Request, res: Response) => {
    //@ts-ignore
    const userId = req.user.userId;
    try {
      if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }
      const exists = await checkExistingBitcoinWallet(userId);
      if (exists) {
        res.status(400).json({ message: 'Wallet Already Activated' });
        return;
      }
      await createUserBitcoinWallet(userId);

      res.json({ message: 'Account activated successfully' });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }
);

const userDetails = AsyncHandler(async (req: Request, res: Response) => {
  //@ts-ignore
  const userId = req.user.userId;
  try {
    const exists = await checkExistingWallet(userId);
    if (!exists) {
      res.status(400).json({ message: 'No Wallet found' });
      return;
    }
    const hasBitcoinWallet = await checkExistingBitcoinWallet(userId);
    let bitcoinBalanceDetails;
    let bitcoinAddress;

    if (hasBitcoinWallet) {
      bitcoinBalanceDetails = await getBitcoinBalanceDetails(userId);
      bitcoinAddress = await getBitcoinAddress(userId);
    }

    const details = await getUserWeb3Wallet(userId);

    //remove encryptedKey
    const { encryptedKey, publicKey, ...user } = details;

    res.json({
      data: {
        ...user,
        btcAddress: bitcoinAddress || null,
        bitcoinBalance: {
          total: bitcoinBalanceDetails?.totalBalance || 0,
          available: bitcoinBalanceDetails?.availableBalance || 0,
          locked: bitcoinBalanceDetails?.lockedAmount || 0,
          isLocked: bitcoinBalanceDetails?.isLocked || false,
          lockDetails: bitcoinBalanceDetails?.lockDetails || null,
        },
      },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

const withdraw = AsyncHandler(async (req: Request, res: Response) => {
  try {
    const { amount, address, tokenId, network } = req.body;

    if (!amount || !address || !tokenId || !network) {
      res.status(400).json({
        message: 'input amount, adddress,tokenID,network',
      });
      return;
    }
    //@ts-ignore
    const user = req.user.userId;
    if (!user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const wallet = await getUserWeb3Wallet(user);
    if (!wallet) {
      res.status(400).json({ message: 'Wallet not found for this user' });
      return;
    }
    const userPrivateKey = decrypt(wallet.encryptedKey);
    const tokenIdNum = parseInt(tokenId, 10);
    if (isNaN(tokenIdNum)) {
      res.status(400).json({ message: 'Invalid tokenId' });
      return;
    }
    const tokenAddressToSaveWith = tokenAddress(tokenIdNum, network);

    const data = await transferStable(
      userPrivateKey,
      amount,
      address,
      tokenAddressToSaveWith,
      network
    );
    res.status(200).json({
      status: 'success',
      message: 'Token has been transferred successfully',
      data,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

const withdrawBitcoin = AsyncHandler(async (req: Request, res: Response) => {
  const { amount, address } = req.body;
  if (!amount || !address) {
    res.status(400).json({
      message: 'amount and address is not defined ',
    });
  }
  // Validate Bitcoin address
  if (!validateBitcoinAddress(address)) {
    res.status(400).json({
      message: 'Invalid Bitcoin address',
    });
    return;
  }
  //@ts-ignore
  const userId = req.user.userId;
  if (!userId) {
    res.status(401).json({
      message: 'Unauthorized',
    });
  }

  try {
    const data = await transferBitcoin(userId, amount, address);
    res.status(StatusCodes.OK).json({
      status: 'success',
      message: 'Bitcoin successfully sent ',
      data,
    });
  } catch (error: any) {
    console.error('Error transferring Bitcoin:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: error.message || 'Bitcoin transfer failed',
    });
  }
});

const lockBitcoin = AsyncHandler(async (req: Request, res: Response) => {
  const { amount, duration, reason } = req.body;

  if (!amount || !duration) {
    res.status(400).json({
      message: 'Amount and duration are required',
    });
    return;
  }

  if (amount <= 0 || duration <= 0) {
    res.status(400).json({
      message: 'Amount and duration must be positive numbers',
    });
    return;
  }

  //@ts-ignore
  const userId = req.user.userId;

  if (!userId) {
    res.status(401).json({
      message: 'Unauthorized',
    });
    return;
  }

  try {
    const wallet = await lockBitcoinAmount(userId, amount, duration, reason);

    res.status(200).json({
      status: 'success',
      message: 'Bitcoin successfully locked',
      data: {
        amount: wallet.lockedAmount,
        lockedAt: wallet.lockedAt,
        unlocksAt: wallet.unlocksAt,
        lockDuration: wallet.lockDuration,
        lockReason: wallet.lockReason,
        isLocked: wallet.isLocked,
      },
    });
  } catch (error: any) {
    console.error('Error locking Bitcoin:', error);
    res.status(500).json({
      message: error.message || 'Failed to lock Bitcoin',
    });
  }
});

const unlockBitcoin = AsyncHandler(async (req: Request, res: Response) => {
  //@ts-ignore
  const userId = req.user.userId;

  if (!userId) {
    res.status(401).json({
      message: 'Unauthorized',
    });
    return;
  }

  try {
    const wallet = await unlockBitcoinAmount(userId);

    res.status(200).json({
      status: 'success',
      message: 'Bitcoin successfully unlocked',
      data: {
        unlockedAt: new Date(),
        isLocked: wallet.isLocked,
      },
    });
  } catch (error: any) {
    console.error('Error unlocking Bitcoin:', error);
    res.status(500).json({
      message: error.message || 'Failed to unlock Bitcoin',
    });
  }
});

const getBitcoinBalanceWithLocks = AsyncHandler(
  async (req: Request, res: Response) => {
    //@ts-ignore
    const userId = req.user.userId;

    if (!userId) {
      res.status(401).json({
        message: 'Unauthorized',
      });
      return;
    }

    try {
      const balanceDetails = await getBitcoinBalanceDetails(userId);

      res.status(200).json({
        status: 'success',
        data: balanceDetails,
      });
    } catch (error: any) {
      console.error('Error fetching Bitcoin balance with locks:', error);
      res.status(500).json({
        message: error.message || 'Failed to fetch balance',
      });
    }
  }
);

const getLockStatus = AsyncHandler(async (req: Request, res: Response) => {
  //@ts-ignore
  const userId = req.user.userId;

  if (!userId) {
    res.status(401).json({
      message: 'Unauthorized',
    });
    return;
  }

  try {
    const lockStatus = await getBitcoinLockStatus(userId);

    res.status(200).json({
      status: 'success',
      data: lockStatus,
    });
  } catch (error: any) {
    console.error('Error checking lock status:', error);
    res.status(500).json({
      message: error.message || 'Failed to check lock status',
    });
  }
});

export {
  activateWeb3Wallet,
  activateBitcoinWallet,
  userDetails,
  withdraw,
  withdrawBitcoin,
  lockBitcoin,
  unlockBitcoin,
  getBitcoinBalanceWithLocks,
  getLockStatus,
};
