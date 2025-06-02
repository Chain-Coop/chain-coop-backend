// services/periodicSavingService.ts
import { CronJob } from 'cron';
import { ethers } from 'ethers';
import crypto from 'crypto';
import {
  PeriodicSaving,
  SavingInterval,
  TransactionStatus,
  DepositType,
} from '../../../models/web3/periodicSaving';
import {
  openPool,
  updatePoolAmount,
  userPoolsByPoolId,
} from '../chaincoopSaving.2.0/savingServices';
import { getTokenAddressSymbol } from '../../web3/accountService';
import { decrypt, encrypt } from '../../../services/encryption';

import SavingPoolABI from '../../../constant/abi/ChainCoopSaving.2.0.json';
import { createTransactionHistory } from '../historyService';

const iface = new ethers.Interface(SavingPoolABI.abi);
const CRON_EXPRESSIONS: Record<SavingInterval, string> = {
  [SavingInterval.DAILY]: '0 0 * * *',
  [SavingInterval.WEEKLY]: '0 0 * * 0',
  [SavingInterval.MONTHLY]: '0 0 1 * *',
};

class PeriodicSavingService {
  private cronJobs = new Map<string, CronJob>();

  async initialize(network: string): Promise<void> {
    try {
      this.scheduleDueExecutionsJob(network);

      const activeSavings = await PeriodicSaving.find({ isActive: true });
      console.log(`Found ${activeSavings.length} active periodic savings`);

      for (const saving of activeSavings) {
        this.scheduleIndividualSaving(saving, network);
      }

      console.log('Periodic saving service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize periodic savings:', error);
    }
  }

  private scheduleDueExecutionsJob(network: string): void {
    const job = new CronJob('0 * * * *', async () => {
      try {
        console.log('Checking for due periodic savings...');
        const dueExecutions = await PeriodicSaving.findDueExecutions();

        for (const saving of dueExecutions) {
          try {
            await this.executeSaving(saving, network);
          } catch (err) {
            console.error(`Error executing saving ${saving.poolId}:`, err);
          }
        }
      } catch (err) {
        console.error('Error checking due executions:', err);
      }
    });

    job.start();
    console.log('Scheduled job to check for due executions');
  }

  private scheduleIndividualSaving(saving: any, network: string): void {
    const cronExpression = CRON_EXPRESSIONS[saving.interval as SavingInterval];

    const job = new CronJob(cronExpression, async () => {
      if (!saving.isActive) return;

      try {
        await this.executeSaving(saving, network);
      } catch (err) {
        console.error(
          `Failed to execute periodic saving for pool ${saving.poolId}:`,
          err
        );
      }
    });

    job.start();
    this.cronJobs.set(saving.poolId, job);
    console.log(`Scheduled job for pool ${saving.poolId}`);
  }

  async executeSaving(saving: any, network: string): Promise<void> {
    console.log(`Executing periodic saving for pool ${saving.poolId}`);

    try {
      const privateKey = decrypt(saving.encryptedPrivateKey);
      const tx = await updatePoolAmount(
        saving.poolId,
        saving.periodicAmount,
        saving.tokenAddress,
        privateKey,
        network
      );
      await tx.wait();
      const pool = await userPoolsByPoolId(saving.poolId, network);
      await createTransactionHistory(
        saving.userId.toString(),
        saving.periodicAmount,
        'UPDATE',
        tx.hash,
        saving.tokenSymbol
      );

      await saving.addTransaction(
        tx.hash,
        saving.periodicAmount,
        TransactionStatus.CONFIRMED,
        DepositType.UPDATE,
        pool.amountSaved
      );
      await saving.updateLastExecution();

      console.log(
        `Successfully executed periodic saving for pool ${saving.poolId}`
      );
    } catch (error: any) {
      throw error;
    }
  }

  async createPeriodicSaving(
    userId: string,
    tokenAddress: string,
    initialAmount: string,
    periodicAmount: string,
    reason: string,
    lockType: number,
    duration: number,
    interval: SavingInterval,
    privateKey: string,
    network: string
  ): Promise<any> {
    try {
      const tokenSymbol = await getTokenAddressSymbol(tokenAddress, network);

      const tx = await openPool(
        tokenAddress,
        initialAmount,
        reason,
        lockType,
        duration,
        privateKey,
        network
      );
      const receipt = await tx.wait();
      const poolId = this.extractPoolIdFromReceipt(receipt);
      const pool = await userPoolsByPoolId(poolId, network);

      const encryptedPrivateKey = encrypt(privateKey);

      const saving = new PeriodicSaving({
        userId,
        poolId,
        tokenAddress,
        tokenSymbol,
        initialAmount,
        periodicAmount,
        reason,
        lockType,
        duration,
        interval,
        encryptedPrivateKey,
        lastExecutionTime: new Date(),
        network,
      });

      await saving.save();
      await saving.addTransaction(
        tx.hash,
        initialAmount,
        TransactionStatus.CONFIRMED,
        DepositType.SAVE,
        pool.amountSaved
      );

      this.scheduleIndividualSaving(saving, network);
      return tx;
    } catch (error: any) {
      console.error('Failed to create periodic saving:', error);
      throw new Error('Failed to set up periodic saving: ' + error.message);
    }
  }

  extractPoolIdFromReceipt(receipt: any): string {
    try {
      for (const log of receipt.logs) {
        try {
          const parsedLog = iface.parseLog(log);

          if (parsedLog && parsedLog.name === 'OpenSavingPool') {
            const poolId = parsedLog.args._poolId;
            return poolId.toString();
          }
        } catch (err) {
          // Ignore logs that can't be parsed by this ABI
          continue;
        }
      }

      throw new Error('OpenSavingPool event not found');
    } catch (err) {
      console.error('Error extracting pool ID:', err);
      throw err;
    }
  }

  async stopPeriodicSaving(poolId: string): Promise<any> {
    const saving = await PeriodicSaving.findOne({ poolId });
    if (!saving) throw new Error('Saving not found');

    saving.isActive = false;
    await saving.save();

    const job = this.cronJobs.get(poolId);
    if (job) {
      job.stop();
      this.cronJobs.delete(poolId);
    }

    return saving;
  }

  async resumePeriodicSaving(poolId: string, network: string): Promise<any> {
    const saving = await PeriodicSaving.findOne({ poolId });
    if (!saving) throw new Error('Saving not found');

    saving.isActive = true;
    await saving.save();

    this.scheduleIndividualSaving(saving, network);
    return saving;
  }

  async updateSavingAmount(poolId: string, newAmount: string): Promise<any> {
    const saving = await PeriodicSaving.findOne({ poolId });
    if (!saving) throw new Error('Saving not found');

    saving.periodicAmount = newAmount;
    await saving.save();

    return saving;
  }

  async getUserPeriodicSavings(userId: string): Promise<any[]> {
    return PeriodicSaving.find({ userId }).sort({ createdAt: -1 });
  }

  async getPeriodicSaving(poolId: string): Promise<any> {
    return PeriodicSaving.findOne({ poolId });
  }
}

export const periodicSavingService = new PeriodicSavingService();
