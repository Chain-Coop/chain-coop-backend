import AsyncHandler from 'express-async-handler';
import axios from 'axios';
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
  transferCrypto,
  getLockDetails,
} from '../../services/web3/accountService';
import Web3Wallet, { Web3WalletDocument } from '../../models/web3Wallet';
import { decrypt } from '../../services/encryption';
import { tokenAddress } from '../../utils/web3/tokenaddress';
import { StatusCodes } from 'http-status-codes';
import { bitcoin } from 'bitcoinjs-lib/src/networks';
require('dotenv').config();

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
const transferGasfees = AsyncHandler(async (req: Request, res: Response) => {
  //@ts-ignore
  const userId = req.user.userId;
  try {
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    const exists = await checkExistingWallet(userId);
    if (!exists) {
      res.status(400).json({ message: 'No Wallet found' });
      return;
    }
    const wallet = await getUserWeb3Wallet(userId);
    const bnbRate = await axios.get<{ binancecoin: { usd: number } }>(
      `https://api.coingecko.com/api/v3/simple/price?vs_currencies=usd&ids=binancecoin`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.COIN_GECKO_API_KEY}`,
        },
      }
    );

    const bnbPrice = String((0.5 / bnbRate.data?.binancecoin.usd).toFixed(6));
    const polRate = await axios.get<{ [key: string]: { usd: number } }>(
      `https://api.coingecko.com/api/v3/simple/price?vs_currencies=usd&ids=matic-network`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.COIN_GECKO_API_KEY}`,
        },
      }
    );
    const polPrice = String(
      (0.5 / polRate.data['matic-network'].usd).toFixed(2)
    );

    const tx = await transferCrypto(bnbPrice, wallet.address, 'BSC');
    const tx1 = await transferCrypto(polPrice, wallet.address, 'POLYGON');
    await tx.wait(1);
    await tx1.wait(1);
    res.status(200).json({
      status: 'success',
      message: 'Gas fees transferred successfully',
      data: {
        bscTransactionHash: tx.hash,
        polygonTransactionHash: tx1.hash,
      },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

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
          locked: bitcoinBalanceDetails?.lockedBalance || 0,
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
        unlocksAt: wallet.maturityDate,
        lockDuration: wallet.lockDuration,
        lockReason: wallet.purpose,
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

const getLockSummary = AsyncHandler(async (req: Request, res: Response) => {
  //@ts-ignore
  const userId = req.user.userId;
  const { lockId } = req.params;

  if (!userId) {
    res.status(401).json({
      message: 'Unauthorized',
    });
    return;
  }

  if (!lockId) {
    res.status(400).json({
      message: 'Lock ID is required',
    });
    return;
  }

  try {
    const lockDetails = await getLockDetails(userId, lockId);

    res.status(200).json({
      status: 'success',
      data: lockDetails,
    });
  } catch (error: any) {
    console.error('Error fetching lock details:', error);
    res.status(500).json({
      message: error.message || 'Failed to fetch lock details',
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
  transferGasfees,
  getLockSummary,
};
