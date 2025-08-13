import { Request, Response } from 'express';
import * as lndService from '../../../services/web3/lndService/lndService';
import { StatusCodes } from 'http-status-codes';
import { get } from 'axios';

export const lockFunds = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const { userId } = req.user;
    const { amount, unlockAt, purpose = 'staking' } = req.body;
    const parsedAmount = Number(amount);

    // Input validation
    if (isNaN(parsedAmount) || parsedAmount <= 1e-10) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Valid amount is required',
      });
    }
    if (!unlockAt || new Date(unlockAt) <= new Date()) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Valid future unlock date is required',
      });
    }

    const result = await lndService.lockBalance(
      userId,
      parsedAmount,
      new Date(unlockAt),
      purpose
    );

    res.status(StatusCodes.OK).json({
      message: 'Funds locked successfully',
      data: { result },
    });
  } catch (error: any) {
    console.error('Lock funds failed:', error);
    res.status(StatusCodes.BAD_REQUEST).json({
      message: 'Failed to lock funds',
      error: error.message,
    });
  }
};

export const getWalletInfo = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const { userId } = req.user;

    const walletDetails = await lndService.getWalletDetails(userId);

    res.status(StatusCodes.OK).json({
      message: 'Wallet details retrieved successfully',
      data: walletDetails,
    });
  } catch (error: any) {
    console.error('Get wallet info failed:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Failed to get wallet information',
      error: error.message,
    });
  }
};

export const unlockFunds = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const { userId } = req.user;

    const result = await lndService.unlockExpiredFunds(userId);

    res.status(StatusCodes.OK).json({
      message: 'Funds unlocked successfully',
      data: {
        unlockedAmount: result.unlockedAmount,
        availableBalance: result.wallet.balance - result.wallet.lockedBalance,
      },
    });
  } catch (error: any) {
    console.error('Unlock funds failed:', error);
    res.status(StatusCodes.BAD_REQUEST).json({
      message: 'Failed to unlock funds',
      error: error.message,
    });
  }
};

export const getLockStatus = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const { userId } = req.user;

    const lockStatus = await lndService.getBitcoinLockStatus(userId);

    res.status(StatusCodes.OK).json({
      message: 'Lock status retrieved successfully',
      data: lockStatus,
    });
  } catch (error: any) {
    console.error('Get lock status failed:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Failed to get lock status',
      error: error.message,
    });
  }
};

export const getLockDetails = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const { userId } = req.user;
    const { lockId } = req.params;

    if (!lockId) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Lock ID is required',
      });
    }

    const lockDetails = await lndService.getLockDetails(userId, lockId);

    res.status(StatusCodes.OK).json({
      message: 'Lock details retrieved successfully',
      data: lockDetails,
    });
  } catch (error: any) {
    console.error('Get lock details failed:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Failed to get lock details',
      error: error.message,
    });
  }
};

export const getAvailableBalance = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const { userId } = req.user;

    const availableBalance = await lndService.getAvailableBalance(userId);

    res.status(StatusCodes.OK).json({
      message: 'Available balance retrieved successfully',
      data: { availableBalance },
    });
  } catch (error: any) {
    console.error('Get available balance failed:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Failed to get available balance',
      error: error.message,
    });
  }
};

export const getBitcoinBalance = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const { userId } = req.user;

    const balanceDetails = await lndService.getBitcoinBalance(userId);

    res.status(StatusCodes.OK).json({
      message: 'Bitcoin balance retrieved successfully',
      data: balanceDetails,
    });
  } catch (error: any) {
    console.error('Get Bitcoin balance  failed:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Failed to get Bitcoin balance',
      error: error.message,
    });
  }
};
