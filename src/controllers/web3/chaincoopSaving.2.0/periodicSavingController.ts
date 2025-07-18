// controllers/PeriodicSavingController.ts
import { Request, Response } from 'express';
import {
  PeriodicSaving,
  SavingInterval,
  Transaction,
  TransactionStatus,
  DepositType,
} from '../../../models/web3/periodicSaving';
import { periodicSavingService } from '../../../services/web3/chaincoopSaving.2.0/periodicSavingService';
import {
  checkStableUserBalance,
  getTokenAddressSymbol,
  getUserWeb3Wallet,
} from '../../../services/web3/accountService';
import { decrypt } from '../../../services/encryption';
import { tokenAddress } from '../../../utils/web3/tokenaddress';
import { createTransactionHistory } from '../../../services/web3/historyService';
import {
  userPoolsByPoolId,
  withdrawFromPool,
} from '../../../services/web3/chaincoopSaving.2.0/savingServices';

export class PeriodicSavingController {
  public static async createPeriodicSaving(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const {
        tokenId,
        initialSaveAmount,
        periodicAmount,
        reasonForSaving,
        lockedType,
        duration,
        interval,
        network,
      } = req.body;

      // Validate required fields
      if (
        !tokenId ||
        !initialSaveAmount ||
        !periodicAmount ||
        !reasonForSaving ||
        lockedType === undefined ||
        !duration ||
        !interval ||
        !network
      ) {
        res
          .status(400)
          .json({ success: false, message: 'Missing required fields' });
        return;
      }

      // Validate interval
      if (!Object.values(SavingInterval).includes(interval)) {
        res
          .status(400)
          .json({ success: false, message: 'Invalid interval value' });
        return;
      }

      // Validate lockType
      if (![0, 1, 2].includes(lockedType)) {
        res.status(400).json({
          success: false,
          message: 'Invalid lock type. Must be 0, 1, or 2',
        });
        return;
      }
      const tokenIdNum = parseInt(tokenId, 10);
      if (isNaN(tokenIdNum)) {
        res.status(400).json({ message: 'Invalid tokenId' });
        return;
      }
      const tokenAddressToSaveWith = tokenAddress(tokenIdNum, network);
      //@ts-ignore
      const userId = req.user.userId; // Assuming req.user is set by auth middleware
      console.log('userId', userId);

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
      const privateKey = decrypt(wallet.encryptedKey);

      const tx = await periodicSavingService.createPeriodicSaving(
        userId,
        tokenAddressToSaveWith,
        initialSaveAmount,
        periodicAmount,
        reasonForSaving,
        lockedType,
        duration,
        interval,
        privateKey,
        network
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

      res.status(201).json({
        success: true,
        message: 'Periodic saving pool created successfully',
        data: { txHash: tx.hash },
      });
    } catch (error: any) {
      console.error('Error creating periodic saving:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create periodic saving',
      });
    }
  }

  public static async withdrawFromPoolByID(
    req: Request,
    res: Response
  ): Promise<void> {
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
      const periodicSaving = await PeriodicSaving.findOne({
        poolId: poolId_bytes,
      });
      if (!periodicSaving) {
        res
          .status(400)
          .json({ message: `Failed to find a pool ${poolId_bytes}` });
        return;
      }
      const pool = await userPoolsByPoolId(
        poolId_bytes,
        periodicSaving.network
      );
      if (!pool) {
        res
          .status(400)
          .json({ message: `Failed to get a pool ${poolId_bytes}` });
        return;
      }

      const tx = await withdrawFromPool(
        poolId_bytes,
        userPrivateKey,
        periodicSaving.network
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
        timestamp: new Date(),
        status: TransactionStatus.CONFIRMED,
        depositType: DepositType.WITHDRAW,
        poolAmount: pool.amountSaved,
      };

      periodicSaving.isActive = false;
      periodicSaving.totalAmount = '0';
      periodicSaving.transactions.push(withdrawTransaction);
      await periodicSaving.save();

      const tokenAddressToSaveWith = pool.tokenToSaveWith;
      const tokenSymbol = await getTokenAddressSymbol(
        tokenAddressToSaveWith,
        periodicSaving.network
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

  public static async getUserPeriodicSavings(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      //@ts-ignore
      const userId = req.user.userId; // Assuming req.user is set by auth middleware

      const savings = await periodicSavingService.getUserPeriodicSavings(
        userId
      );
      res.status(200).json({
        success: true,
        data: savings,
      });
    } catch (error: any) {
      console.error('Error fetching user periodic savings:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch periodic savings',
      });
    }
  }

  /**
   * Get a specific periodic saving
   * @route GET /api/periodic-savings/:id
   */
  public static async getPeriodicSaving(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { id } = req.params as { id: string };
      //@ts-ignore
      const userId = req.user.userId; // Assuming req.user is set by auth middleware

      const saving = await periodicSavingService.getPeriodicSaving(id);

      if (!saving) {
        res
          .status(404)
          .json({ success: false, message: 'Periodic saving not found' });
        return;
      }
      // Check if user owns this saving
      if (saving.userId.toString() !== userId) {
        res
          .status(403)
          .json({ success: false, message: 'Unauthorized access' });
        return;
      }

      res.status(200).json({
        success: true,
        data: saving,
      });
    } catch (error: any) {
      console.error('Error fetching periodic saving:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch periodic saving',
      });
    }
  }

  /**
   * Stop a periodic saving
   * @route POST /api/periodic-savings/:id/stop
   */
  public static async stopPeriodicSaving(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { id } = req.params as { id: string };
      //@ts-ignore
      const userId = req.user.userId; // Assuming req.user is set by auth middleware

      // Verify ownership before stopping
      const saving = await periodicSavingService.getPeriodicSaving(id);

      if (!saving) {
        res
          .status(404)
          .json({ success: false, message: 'Periodic saving not found' });
        return;
      }

      if (saving.userId.toString() !== userId) {
        res
          .status(403)
          .json({ success: false, message: 'Unauthorized access' });
        return;
      }

      await periodicSavingService.stopPeriodicSaving(id);

      res.status(200).json({
        success: true,
        message: 'Periodic saving stopped successfully',
      });
    } catch (error: any) {
      console.error('Error stopping periodic saving:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to stop periodic saving',
      });
    }
  }

  /**
   * Resume a periodic saving
   * @route POST /api/periodic-savings/:id/resume
   */
  public static async resumePeriodicSaving(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { id } = req.params as { id: string };
      //@ts-ignore
      const userId = req.user.userId; // Assuming req.user is set by auth middleware

      // Verify ownership before resuming
      const saving = await periodicSavingService.getPeriodicSaving(id);

      if (!saving) {
        res
          .status(404)
          .json({ success: false, message: 'Periodic saving not found' });
        return;
      }

      if (saving.userId.toString() !== userId) {
        res
          .status(403)
          .json({ success: false, message: 'Unauthorized access' });
        return;
      }

      await periodicSavingService.resumePeriodicSaving(id, saving.network);

      res.status(200).json({
        success: true,
        message: 'Periodic saving resumed successfully',
      });
    } catch (error: any) {
      console.error('Error resuming periodic saving:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to resume periodic saving',
      });
    }
  }

  /**
   * Update periodic saving amount
   * @route PUT /api/periodic-savings/:id/amount
   */
  public static async updateSavingAmount(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { id } = req.params as { id: string };
      const { amount } = req.body;
      //@ts-ignore
      const userId = req.user.userId; // Assuming req.user is set by auth middleware

      if (!amount) {
        res.status(400).json({ success: false, message: 'Amount is required' });
        return;
      }

      // Verify ownership before updating
      const saving = await periodicSavingService.getPeriodicSaving(id);

      if (!saving) {
        res
          .status(404)
          .json({ success: false, message: 'Periodic saving not found' });
        return;
      }

      if (saving.userId.toString() !== userId) {
        res
          .status(403)
          .json({ success: false, message: 'Unauthorized access' });
        return;
      }

      const updatedSaving = await periodicSavingService.updateSavingAmount(
        id,
        amount
      );

      res.status(200).json({
        success: true,
        message: 'Periodic saving amount updated successfully',
        data: updatedSaving,
      });
    } catch (error: any) {
      console.error('Error updating periodic saving amount:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update periodic saving amount',
      });
    }
  }

  /**
   * Manual execution of a periodic saving
   * @route POST /api/periodic-savings/:id/execute
   */
  public static async executePeriodicSaving(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { id } = req.params as { id: string};

      //@ts-ignore

      const userId = req.user.userId; // Assuming req.user is set by auth middleware

      // Verify ownership before executing
      const saving = await periodicSavingService.getPeriodicSaving(id);

      if (!saving) {
        res
          .status(404)
          .json({ success: false, message: 'Periodic saving not found' });
        return;
      }

      if (saving.userId.toString() !== userId) {
        res
          .status(403)
          .json({ success: false, message: 'Unauthorized access' });
        return;
      }

      if (!saving.isActive) {
        res
          .status(400)
          .json({ success: false, message: 'Cannot execute inactive saving' });
        return;
      }

      await periodicSavingService.executeSaving(saving, saving.network);

      res.status(200).json({
        success: true,
        message:
          'Manual execution initiated. Transaction will be processed shortly.',
      });
    } catch (error: any) {
      console.error('Error executing periodic saving:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to execute periodic saving',
      });
    }
  }
  public static async getTotalAmountSavedByUser(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      //@ts-ignore
      const userId = req.user.userId; // Assuming req.user is set by auth middleware
      const periodicSavings = await PeriodicSaving.find({
        userId,
        isActive: true,
      }).sort({ createdAt: -1 });
      const totalAmountSaved = periodicSavings.reduce(
        (total, saving) => total + parseFloat(saving.totalAmount),
        0
      );
      res.status(200).json({
        success: true,
        data: totalAmountSaved,
      });
    } catch (error: any) {
      console.error('Error fetching total amount saved by user:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch total amount saved by user',
      });
    }
  }

  public static async getUserPoolbyReason(
    req: Request,
    res: Response
  ): Promise<void> {
    const { reason } = req.body;
    //@ts-ignore
    const userId = req.user.userId;
    try {
      if (!reason) {
        res.status(400).json({ message: 'Provide all required values reason' });
        return;
      }
      const periodicSaving = await PeriodicSaving.find({
        reason: { $regex: reason, $options: 'i' },
        userId,
      }).sort({ createdAt: -1 });
      if (!periodicSaving) {
        res.status(400).json({ message: 'No periodic saving found' });
        return;
      }
      res.status(200).json({ message: 'Success', data: periodicSaving });
      return;
    } catch (error: any) {
      console.log(error);
      res
        .status(500)
        .json({ message: `internal server error${error.message}` });
    }
  }

  public static async intializePeriodicSaving(
    req: Request,
    res: Response
  ): Promise<void> {
    const { network } = req.params as { network: string };
    if (!network) {
      res.status(400).json({ message: 'Network is required' });
      return;
    }

    try {
      await periodicSavingService.initialize(network);
      res.status(200).json({
        success: true,
        message: 'Periodic saving service initialized successfully',
      });
    } catch (error: any) {
      console.error('Error initializing periodic saving service:', error);
      res.status(500).json({
        success: false,
        message:
          error.message || 'Failed to initialize periodic saving service',
      });
    }
  }
}
