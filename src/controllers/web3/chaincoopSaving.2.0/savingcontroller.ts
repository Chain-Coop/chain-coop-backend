import asyncHandler from 'express-async-handler';
import { Request, Response } from 'express';
import { getUserWeb3Wallet } from '../../../services/web3/accountService';
import {
  getTokenAddressSymbol,
  checkStableUserBalance,
} from '../../../services/web3/accountService';
import { createTransactionHistory } from '../../../services/web3/historyService';

import { decrypt } from '../../../services/encryption';

import { tokenAddress } from '../../../utils/web3/tokenaddress';
import {
  openPool,
  userPools,
  userPoolsByPoolId,
  totalPoolCreated,
  withdrawFromPool,
  updatePoolAmount,
  stopSaving,
  restartSaving,
  getUserContributions,
} from '../../../services/web3/chaincoopSaving.2.0/savingServices';

const openSavingPool = asyncHandler(async (req: Request, res: Response) => {
  const {
    tokenId,
    initialSaveAmount,
    lockedType,
    reasonForSaving,
    duration,
  } = req.body; //1 is for usdc , 2 for Lisk Token  -> duration is in seconds
  //@ts-ignore
  const userId = req.user.userId;
  try {
    if (
      !initialSaveAmount ||
      lockedType === undefined ||
      !reasonForSaving ||
      !duration
    ) {
      res.status(400).json({
        message:
          'Provide all required values initialSaveAmount,lockType,reasonForSaving,duration',
      });
      return;
    }
    if (![0, 1, 2].includes(lockedType)) {
      res.status(400).json({
        message: 'Invalid lockType. It should be 0, 1, or 2.',
      });
      return;
    }
    const tokenIdNum = parseInt(tokenId, 10);
    if (isNaN(tokenIdNum)) {
      res.status(400).json({ message: 'Invalid tokenId' });
      return;
    }
    const tokenAddressToSaveWith = tokenAddress(tokenIdNum);
    const wallet = await getUserWeb3Wallet(userId);
    if (!wallet) {
      res.status(400).json({ message: 'Please activate wallet' });
      return;
    }
    const { bal: balance }: { bal: number; symbol: string } =
      await checkStableUserBalance(wallet.address, tokenAddressToSaveWith);
    if (balance < parseFloat(initialSaveAmount)) {
      res.status(400).json({
        message: `Insufficient balance. Your balance is ${balance} and you need ${initialSaveAmount}`,
      });
      return;
    }

    const userPrivateKey = decrypt(wallet.encryptedKey);

    const tx = await openPool(
      tokenAddressToSaveWith,
      initialSaveAmount,
      reasonForSaving,
      lockedType,
      duration,
      userPrivateKey
    );
    if (!tx) {
      res.status(400).json({ message: 'Failed to open a pool' });
      return;
    }
    const tokenSymbol = await getTokenAddressSymbol(tokenAddressToSaveWith);
    await createTransactionHistory(
      userId,
      parseFloat(initialSaveAmount),
      'SAVE',
      tx.hash,
      tokenSymbol
    );
    res.status(200).json({ message: 'Success', data: tx.hash });
    return;
  } catch (error: any) {
    console.log(error);
    res.status(500).json({ message: `internal server error${error.message}` });
  }
});

const updatePoolWithAmount = asyncHandler(
  async (req: Request, res: Response) => {
    const { poolId_bytes, tokenAddressToSaveWith, amount } = req.body;
    //@ts-ignore
    const userId = req.user.userId;
    try {
      if (!poolId_bytes || !tokenAddressToSaveWith || !amount) {
        res.status(400).json({
          message:
            'Provide all required values poolId_bytes,tokenAddressToSaveWith,amount',
        });
        return;
      }

      const wallet = await getUserWeb3Wallet(userId);
      if (!wallet) {
        res.status(400).json({ message: 'Please activate wallet' });
        return;
      }

      const { bal: balance }: { bal: number; symbol: string } =
        await checkStableUserBalance(wallet.address, tokenAddressToSaveWith);
      if (balance < parseFloat(amount)) {
        res.status(400).json({
          message: `Insufficient balance. Your balance is ${balance} and you need ${amount}`,
        });
        return;
      }

      const userPrivateKey = decrypt(wallet.encryptedKey);
      const tx = await updatePoolAmount(
        poolId_bytes,
        amount,
        tokenAddressToSaveWith,
        userPrivateKey
      );
      if (!tx) {
        res
          .status(400)
          .json({ message: `Failed to update a pool ${poolId_bytes}` });
        return;
      }
      const tokenSymbol = await getTokenAddressSymbol(tokenAddressToSaveWith);
      await createTransactionHistory(
        userId,
        parseFloat(amount),
        'UPDATE',
        tx.hash,
        tokenSymbol
      );
      res.status(200).json({ message: 'Success', data: tx.hash });
      return;
    } catch (error: any) {
      console.log(error);
      res
        .status(500)
        .json({ message: `internal server error${error.message}` });
    }
  }
);

const withdrawFromPoolByID = asyncHandler(
  async (req: Request, res: Response) => {
    const { poolId_bytes } = req.body;
    //@ts-ignore
    const userId = req.user.userId;
    try {
      if (!poolId_bytes) {
        res
          .status(400)
          .json({ message: 'Provide all required values poolId_bytes' });
        return;
      }

      const wallet = await getUserWeb3Wallet(userId);
      if (!wallet) {
        res.status(400).json({ message: 'Please activate wallet' });
        return;
      }
      const userPrivateKey = decrypt(wallet.encryptedKey);
      const pool = await userPoolsByPoolId(poolId_bytes);
      if (!pool) {
        res
          .status(400)
          .json({ message: `Failed to get a pool ${poolId_bytes}` });
        return;
      }
      const tx = await withdrawFromPool(poolId_bytes, userPrivateKey);
      if (!tx) {
        res
          .status(400)
          .json({ message: `Failed to withdraw a pool ${poolId_bytes}` });
        return;
      }
      const tokenAddressToSaveWith = pool.tokenToSaveWith;
      const tokenSymbol = await getTokenAddressSymbol(tokenAddressToSaveWith);
      const amount = pool.amountSaved;
      await createTransactionHistory(
        userId,
        parseFloat(amount),
        'WITHDRAW',
        tx.hash,
        tokenSymbol
      );

      res.status(200).json({ message: 'Success', data: tx.hash });
      return;
    } catch (error: any) {
      console.log(error);
      res
        .status(500)
        .json({ message: `internal server error${error.message}` });
    }
  }
);
//Stop saving pool
const stopSavingForPool = asyncHandler(async (req: Request, res: Response) => {
  const { poolId_bytes } = req.body;
  //@ts-ignore
  const userId = req.user.userId;
  try {
    if (!poolId_bytes) {
      res
        .status(400)
        .json({ message: 'Provide all required values poolId_bytes' });
      return;
    }

    const wallet = await getUserWeb3Wallet(userId);
    if (!wallet) {
      res.status(400).json({ message: 'Please activate wallet' });
      return;
    }
    const userPrivateKey = decrypt(wallet.encryptedKey);
    const tx = await stopSaving(poolId_bytes, userPrivateKey);
    if (!tx) {
      res
        .status(400)
        .json({ message: `Failed to stop a pool for saving ${poolId_bytes}` });
      return;
    }

    res.status(200).json({ message: 'Success', data: tx.hash });
    return;
  } catch (error: any) {
    console.log(error);
    res.status(500).json({ message: `internal server error${error.message}` });
  }
});
//restart for saving
const restartPoolForSaving = asyncHandler(
  async (req: Request, res: Response) => {
    const { poolId_bytes } = req.body;
    //@ts-ignore
    const userId = req.user.userId;
    try {
      if (!poolId_bytes) {
        res
          .status(400)
          .json({ message: 'Provide all required values poolId_bytes' });
        return;
      }

      const wallet = await getUserWeb3Wallet(userId);
      if (!wallet) {
        res.status(400).json({ message: 'Please activate wallet' });
        return;
      }
      const userPrivateKey = decrypt(wallet.encryptedKey);
      const tx = await restartSaving(poolId_bytes, userPrivateKey);
      if (!tx) {
        res.status(400).json({
          message: `Failed to restart pool for saving ${poolId_bytes}`,
        });
        return;
      }

      res.status(200).json({ message: 'Success', data: tx.hash });
      return;
    } catch (error: any) {
      console.log(error);
      res
        .status(500)
        .json({ message: `internal server error${error.message}` });
    }
  }
);

const allUserPools = asyncHandler(async (req: Request, res: Response) => {
  //@ts-ignore
  const userId = req.user.userId;
  try {
    const wallet = await getUserWeb3Wallet(userId);
    if (!wallet) {
      res.status(400).json({ message: 'Please activate wallet' });
      return;
    }

    const pools = await userPools(wallet.address);

    res.status(200).json({ message: 'Success', data: pools });
    return;
  } catch (error: any) {
    console.log(error);
    res.status(500).json({ message: `internal server error${error.message}` });
  }
});

const allUserPoolsContributions = asyncHandler(
  async (req: Request, res: Response) => {
    //@ts-ignore
    const userId = req.user.userId;
    try {
      const wallet = await getUserWeb3Wallet(userId);
      if (!wallet) {
        res.status(400).json({ message: 'Please activate wallet' });
        return;
      }

      const contributions = await getUserContributions(wallet.address);

      res.status(200).json({ message: 'Success', data: contributions });
      return;
    } catch (error: any) {
      console.log(error);
      res
        .status(500)
        .json({ message: `internal server error${error.message}` });
    }
  }
);

const totalNumberPoolCreated = asyncHandler(
  async (req: Request, res: Response) => {
    //@ts-ignore
    const userId = req.user.userId;
    try {
      const totalpools = await totalPoolCreated();

      res.status(200).json({ message: 'Success', data: totalpools });
      return;
    } catch (error: any) {
      console.log(error);
      res
        .status(500)
        .json({ message: `internal server error${error.message}` });
    }
  }
);

export {
  totalNumberPoolCreated,
  withdrawFromPoolByID,
  updatePoolWithAmount,
  allUserPools,
  openSavingPool,
  restartPoolForSaving,
  stopSavingForPool,
  allUserPoolsContributions,
};
