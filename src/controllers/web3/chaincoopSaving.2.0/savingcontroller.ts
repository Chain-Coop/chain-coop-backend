import asyncHandler from 'express-async-handler';
import { Request, Response } from 'express';
import { getUserWeb3Wallet } from '../../../services/web3/accountService';
import {
  getTokenAddressSymbol,
  checkStableUserBalance,
} from '../../../services/web3/accountService';
import { createTransactionHistory } from '../../../services/web3/historyService';
import {
  ManualSaving,
  TransactionStatus,
  DepositType,
  Transaction,
} from '../../../models/web3/manualSaving';
import { periodicSavingService } from '../../../services/web3/chaincoopSaving.2.0/periodicSavingService';

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
  enableAaveForPool,
  getPoolAaveBalance,
  getPoolYield,
  isAaveConfigured,
} from '../../../services/web3/chaincoopSaving.2.0/savingServices';

const openSavingPool = asyncHandler(async (req: Request, res: Response) => {
  const {
    tokenId,
    initialSaveAmount,
    lockedType,
    reasonForSaving,
    duration,
    network,
  } = req.body; //1 is for usdc , 2 for Lisk Token  -> duration is in seconds
  //@ts-ignore
  const userId = req.user.userId;
  try {
    if (
      !initialSaveAmount ||
      lockedType === undefined ||
      !reasonForSaving ||
      !duration ||
      !network
    ) {
      res.status(400).json({
        message:
          'Provide all required values initialSaveAmount,lockType,reasonForSaving,duration,network',
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
    const tokenAddressToSaveWith = tokenAddress(tokenIdNum, network);
    const wallet = await getUserWeb3Wallet(userId);
    if (!wallet) {
      res.status(400).json({ message: 'Please activate wallet' });
      return;
    }
    const { bal: balance }: { bal: number; symbol: string } =
      await checkStableUserBalance(
        wallet.address,
        tokenAddressToSaveWith,
        network
      );
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
      userPrivateKey,
      network
    );
    if (!tx) {
      res.status(400).json({ message: 'Failed to open a pool' });
      return;
    }
    const receipt = await tx.wait(1);
    const poolId = periodicSavingService.extractPoolIdFromReceipt(receipt);
    const pool = await userPoolsByPoolId(poolId, network);
    if (!pool) {
      res.status(400).json({ message: `Failed to get a pool ${poolId}` });
      return;
    }
    const saving = new ManualSaving({
      userId,
      poolId,
      tokenAddress: tokenAddressToSaveWith,
      tokenSymbol: await getTokenAddressSymbol(tokenAddressToSaveWith, network),
      initialAmount: initialSaveAmount,
      reason: reasonForSaving,
      lockType: lockedType,
      duration,
      isActive: true,
      encryptedPrivateKey: wallet.encryptedKey,
      network,
    });
    await saving.save();
    await saving.addTransaction(
      tx.hash,
      initialSaveAmount,
      TransactionStatus.CONFIRMED,
      DepositType.SAVE,
      pool.amountSaved
    );
    const tokenSymbol = await getTokenAddressSymbol(
      tokenAddressToSaveWith,
      network
    );
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

      const saving = await ManualSaving.findOne({
        poolId: poolId_bytes,
      });
      if (!saving) {
        res
          .status(400)
          .json({ message: `Failed to find a pool ${poolId_bytes}` });
        return;
      }

      const { bal: balance }: { bal: number; symbol: string } =
        await checkStableUserBalance(
          wallet.address,
          tokenAddressToSaveWith,
          saving.network
        );
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
        userPrivateKey,
        saving.network
      );
      if (!tx) {
        res
          .status(400)
          .json({ message: `Failed to update a pool ${poolId_bytes}` });
        return;
      }
      await tx.wait();
      const pool = await userPoolsByPoolId(poolId_bytes, saving.network);
      if (!pool) {
        res
          .status(400)
          .json({ message: `Failed to get a pool ${poolId_bytes}` });
        return;
      }

      saving.addTransaction(
        tx.hash,
        amount,
        TransactionStatus.CONFIRMED,
        DepositType.UPDATE,
        pool.amountSaved
      );
      const tokenSymbol = await getTokenAddressSymbol(
        tokenAddressToSaveWith,
        saving.network
      );
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
      const manualSaving = await ManualSaving.findOne({
        poolId: poolId_bytes,
      });
      if (!manualSaving) {
        res
          .status(400)
          .json({ message: `Failed to find a pool ${poolId_bytes}` });
        return;
      }
      const pool = await userPoolsByPoolId(poolId_bytes, manualSaving.network);
      if (!pool) {
        res
          .status(400)
          .json({ message: `Failed to get a pool ${poolId_bytes}` });
        return;
      }
      let yieldEarned = '0';
      if (pool.aaveEnabled) {
        try {
          yieldEarned = await getPoolYield(poolId_bytes, manualSaving.network);
        } catch (error) {
          console.log('Error fetching yield:', error);
        }
      }

      const tx = await withdrawFromPool(
        poolId_bytes,
        userPrivateKey,
        manualSaving.network
      );
      if (!tx) {
        res
          .status(400)
          .json({ message: `Failed to withdraw a pool ${poolId_bytes}` });
        return;
      }
      const withdrawTransaction: Transaction = {
        txHash: tx.hash,
        amount: pool.amountSaved,
        yieldEarned,
        timestamp: new Date(),
        status: TransactionStatus.CONFIRMED,
        depositType: DepositType.WITHDRAW,
        poolAmount: pool.amountSaved,
      };

      manualSaving.isActive = false;
      manualSaving.totalAmount = '0';
      manualSaving.transactions.push(withdrawTransaction);
      await manualSaving.save();

      const tokenAddressToSaveWith = pool.tokenToSaveWith;
      const tokenSymbol = await getTokenAddressSymbol(
        tokenAddressToSaveWith,
        manualSaving.network
      );
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
    const manualSaving = await ManualSaving.findOne({
      poolId: poolId_bytes,
    });
    if (!manualSaving) {
      res
        .status(400)
        .json({ message: `Failed to find a pool ${poolId_bytes}` });
      return;
    }

    const wallet = await getUserWeb3Wallet(userId);
    if (!wallet) {
      res.status(400).json({ message: 'Please activate wallet' });
      return;
    }
    const userPrivateKey = decrypt(wallet.encryptedKey);
    const tx = await stopSaving(
      poolId_bytes,
      userPrivateKey,
      manualSaving.network
    );
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
      const manualSaving = await ManualSaving.findOne({
        poolId: poolId_bytes,
      });
      if (!manualSaving) {
        res
          .status(400)
          .json({ message: `Failed to find a pool ${poolId_bytes}` });
        return;
      }

      const wallet = await getUserWeb3Wallet(userId);
      if (!wallet) {
        res.status(400).json({ message: 'Please activate wallet' });
        return;
      }
      const userPrivateKey = decrypt(wallet.encryptedKey);
      const tx = await restartSaving(
        poolId_bytes,
        userPrivateKey,
        manualSaving.network
      );
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
  const { network } = req.params;
  //@ts-ignore
  const userId = req.user.userId;
  try {
    const wallet = await getUserWeb3Wallet(userId);
    if (!wallet) {
      res.status(400).json({ message: 'Please  activate wallet' });
      return;
    }

    const pools = await userPools(wallet.address, network);

    res.status(200).json({ message: 'Success', data: pools });
    return;
  } catch (error: any) {
    console.log(error);
    res.status(500).json({ message: `internal server error${error.message}` });
  }
});

const allUserPoolsContributions = asyncHandler(
  async (req: Request, res: Response) => {
    const { network } = req.params;
    //@ts-ignore
    const userId = req.user.userId;
    try {
      const wallet = await getUserWeb3Wallet(userId);
      if (!wallet) {
        res.status(400).json({ message: 'Please activate wallet' });
        return;
      }

      const contributions = await getUserContributions(wallet.address, network);

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
    const { network } = req.params;
    //@ts-ignore
    const userId = req.user.userId;
    try {
      const totalpools = await totalPoolCreated(network);

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
const getManualSaving = asyncHandler(async (req: Request, res: Response) => {
  const { poolId } = req.body;
  //@ts-ignore
  const userId = req.user.userId;
  try {
    if (!poolId) {
      res.status(400).json({ message: 'Provide all required values poolId' });
      return;
    }
    const manualSaving = await ManualSaving.findOne({ poolId });
    if (!manualSaving) {
      res.status(400).json({ message: 'No manual saving found' });
      return;
    }
    res.status(200).json({ message: 'Success', data: manualSaving });
    return;
  } catch (error: any) {
    console.log(error);
    res.status(500).json({ message: `internal server error${error.message}` });
  }
});
const getManualSavingByUser = asyncHandler(
  async (req: Request, res: Response) => {
    //@ts-ignore
    const userId = req.user.userId;
    try {
      const manualSaving = await ManualSaving.find({ userId }).sort({
        createdAt: -1,
      });
      if (!manualSaving) {
        res.status(400).json({ message: 'No manual saving found' });
        return;
      }
      res.status(200).json({ message: 'Success', data: manualSaving });
      return;
    } catch (error: any) {
      console.log(error);
      res
        .status(500)
        .json({ message: `internal server error${error.message}` });
    }
  }
);
const getTotalAmountSavedByUser = asyncHandler(
  async (req: Request, res: Response) => {
    //@ts-ignore
    const userId = req.user.userId;
    try {
      const manualSaving = await ManualSaving.find({
        userId,
        isActive: true,
      }).sort({ createdAt: -1 });
      if (!manualSaving) {
        res.status(400).json({ message: 'No manual saving found' });
        return;
      }
      const totalAmount = manualSaving.reduce((acc, curr) => {
        return acc + parseFloat(curr.totalAmount);
      }, 0);
      res.status(200).json({ message: 'Success', data: totalAmount });
      return;
    } catch (error: any) {
      console.log(error);
      res
        .status(500)
        .json({ message: `internal server error${error.message}` });
    }
  }
);
const getUserpoolbyReason = asyncHandler(
  async (req: Request, res: Response) => {
    const { reason } = req.body;
    //@ts-ignore
    const userId = req.user.userId;
    try {
      if (!reason) {
        res.status(400).json({ message: 'Provide all required values reason' });
        return;
      }
      const manualSaving = await ManualSaving.find({
        reason: { $regex: reason, $options: 'i' },
        userId,
      }).sort({ createdAt: -1 });
      if (!manualSaving) {
        res.status(400).json({ message: 'No manual saving found' });
        return;
      }
      res.status(200).json({ message: 'Success', data: manualSaving });
      return;
    } catch (error: any) {
      console.log(error);
      res
        .status(500)
        .json({ message: `internal server error${error.message}` });
    }
  }
);

const enableAaveForPoolController = asyncHandler(
  async (req: Request, res: Response) => {
    const { poolId_bytes } = req.body;
    //@ts-ignore
    const userId = req.user.userId;
    try {
      if (!poolId_bytes) {
        res.status(400).json({
          message: 'Provide all required values: poolId_bytes',
        });
        return;
      }

      const wallet = await getUserWeb3Wallet(userId);
      if (!wallet) {
        res.status(400).json({ message: 'Please activate wallet' });
        return;
      }

      const manualSaving = await ManualSaving.findOne({
        poolId: poolId_bytes,
      });
      if (!manualSaving) {
        res.status(400).json({
          message: `Failed to find a pool ${poolId_bytes}`,
        });
        return;
      }

      // Check if Aave is configured for this token
      const isConfigured = await isAaveConfigured(
        manualSaving.tokenAddress,
        manualSaving.network
      );
      if (!isConfigured) {
        res.status(400).json({
          message: 'Aave is not configured for this token',
        });
        return;
      }

      const userPrivateKey = decrypt(wallet.encryptedKey);
      const tx = await enableAaveForPool(
        poolId_bytes,
        userPrivateKey,
        manualSaving.network
      );

      if (!tx) {
        res.status(400).json({
          message: `Failed to enable Aave for pool ${poolId_bytes}`,
        });
        return;
      }

      await tx.wait();

      manualSaving.isAaveActive = true;
      await manualSaving.save();

      res.status(200).json({
        message: 'Aave enabled successfully',
        data: tx.hash,
      });
      return;
    } catch (error: any) {
      console.log('Error enabling Aave:', error);
      res.status(500).json({
        message: `Internal server error: ${error.message}`,
      });
    }
  }
);
const getPoolAaveBalanceController = asyncHandler(
  async (req: Request, res: Response) => {
    const { poolId, network } = req.params;
    try {
      if (!poolId || !network) {
        res.status(400).json({
          message: 'Provide all required parameters: poolId, network',
        });
        return;
      }

      const aaveBalance = await getPoolAaveBalance(poolId, network);

      res.status(200).json({
        message: 'Success',
        data: {
          poolId,
          aaveBalance,
          network,
        },
      });
      return;
    } catch (error: any) {
      console.log('Error fetching Aave balance:', error);
      res.status(500).json({
        message: `Internal server error: ${error.message}`,
      });
    }
  }
);

/**
 * Get pool's yield earned from Aave
 */
const getPoolYieldController = asyncHandler(
  async (req: Request, res: Response) => {
    const { poolId, network } = req.params;
    try {
      if (!poolId || !network) {
        res.status(400).json({
          message: 'Provide all required parameters: poolId, network',
        });
        return;
      }

      const yieldEarned = await getPoolYield(poolId, network);

      res.status(200).json({
        message: 'Success',
        data: {
          poolId,
          yieldEarned,
          network,
        },
      });
      return;
    } catch (error: any) {
      console.log('Error fetching pool yield:', error);
      res.status(500).json({
        message: `Internal server error: ${error.message}`,
      });
    }
  }
);

const checkAaveConfiguration = asyncHandler(
  async (req: Request, res: Response) => {
    const { tokenId, network } = req.params;
    try {
      if (!tokenId || !network) {
        res.status(400).json({
          message: 'Provide all required parameters: tokenId, network',
        });
        return;
      }
      const tokenIdNum = parseInt(tokenId, 10);
      if (isNaN(tokenIdNum)) {
        res.status(400).json({ message: 'Invalid tokenId' });
        return;
      }
      const tokenAddr = tokenAddress(tokenIdNum, network);
      const isConfigured = await isAaveConfigured(tokenAddr, network);
      res.status(200).json({
        message: 'Success',
        data: {
          tokenId,
          tokenAddress: tokenAddr,
          isAaveConfigured: isConfigured,
          network,
        },
      });
      return;
    } catch (error: any) {
      console.log('Error checking Aave configuration:', error);
      res.status(500).json({
        message: `Internal server error: ${error.message}`,
      });
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
  getManualSaving,
  getManualSavingByUser,
  getTotalAmountSavedByUser,
  getUserpoolbyReason,
  enableAaveForPoolController,
  getPoolAaveBalanceController,
  getPoolYieldController,
  checkAaveConfiguration,
};
