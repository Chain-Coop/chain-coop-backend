// controllers/qoreidController.ts
import { Request, Response } from 'express';
import { BVNRateLimiter, verifyBVNBooleanMatchQoreID } from '../services/bvnService';
import User from '../models/authModel';
import { StatusCodes } from 'http-status-codes';
import { Types } from 'mongoose';

interface BVNMatchCheckSummary {
  bvn_match_check?: {
    status?: string;
    fieldMatches?: {
      firstname?: boolean;
      lastname?: boolean;
    };
  };
}

interface BVNVerificationStatus {
  state?: string;
  status?: string;
}

interface BVNBooleanMatchResult {
  success: boolean;
  data?: {
    summary?: BVNMatchCheckSummary;
    status?: BVNVerificationStatus;
    [key: string]: any;
  };
  [key: string]: any;
}

export const verifyBVNBooleanMatchController = async (req: Request, res: Response) => {
  try {
    const { idNumber } = req.body;
    const userId = req.user?.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if user can make an attempt
    const rateLimitResult = await BVNRateLimiter.canUserAttemptBVN(new Types.ObjectId(userId));
    if (!rateLimitResult.canAttempt) {
      return res.status(StatusCodes.TOO_MANY_REQUESTS).json({
        success: false,
        message: rateLimitResult.message,
        remainingAttempts: rateLimitResult.remainingAttempts,
        nextAttemptTime: rateLimitResult.nextAttemptTime,
      });
    }

    const { firstName, lastName } = user as any;

    const rawResult = await verifyBVNBooleanMatchQoreID({
      idNumber,
      firstname: firstName,
      lastname: lastName,
    });

    const result: BVNBooleanMatchResult = {
      ...rawResult,
      data: rawResult.data as BVNBooleanMatchResult['data'],
    };

    const matchStatus = result.data?.summary?.bvn_match_check?.status;

    const simplifiedData = {
      status: matchStatus || 'unknown',
      firstnameMatch: result.data?.summary?.bvn_match_check?.fieldMatches?.firstname || false,
      lastnameMatch: result.data?.summary?.bvn_match_check?.fieldMatches?.lastname || false,
      verificationState: result.data?.status?.state || 'unknown',
      verificationStatus: result.data?.status?.status || 'unknown',
    };

    let attemptStatus: 'success' | 'failure' = 'failure';
    let errorMessage: string | undefined;

    if (result.success && result.data) {
      attemptStatus = 'success';
    } else {
      attemptStatus = 'failure';
      errorMessage = result?.message || 'BVN verification failed';
    }

    // Log the attempt in database
    await BVNRateLimiter.logBVNAttempt(
      new Types.ObjectId(userId),
      idNumber,
      attemptStatus,
      simplifiedData.status,
      simplifiedData.firstnameMatch,
      simplifiedData.lastnameMatch,
      simplifiedData.verificationState,
      simplifiedData.verificationStatus,
      errorMessage,
    );


    if (!result.success) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: errorMessage,
        data: simplifiedData,
        remainingAttempts: rateLimitResult.remainingAttempts - 1,
      });
    }

    // Only allow upgrade if EXACT_MATCH
    if (matchStatus === 'EXACT_MATCH') {
      if (user.Tier === 2) {
        return res.status(200).json({
          success: true,
          message: 'User is already Tier 2',
          data: null,
        });
      }

      if (user.Tier !== 1) {
        return res.status(400).json({
          success: false,
          message: 'User must be Tier 1 to upgrade to Tier 2',
        });
      }

      user.Tier = 2;
      await user.save();

      return res.status(200).json({
        success: true,
        message: 'BVN match successful. User upgraded to Tier 2.',
        data: simplifiedData,
      });
    }

    await BVNRateLimiter.logBVNAttempt(
      new Types.ObjectId(userId),
      idNumber,
      'failure',
      simplifiedData.status,
      simplifiedData.firstnameMatch,
      simplifiedData.lastnameMatch,
      simplifiedData.verificationState,
      simplifiedData.verificationStatus,
      'BVN verification failed. Names do not match exactly.',
    );

    // If not EXACT_MATCH
    return res.status(400).json({
      success: false,
      message: 'BVN verification failed. Names do not match.',
      data: simplifiedData,
    });

  } catch (error) {
    // Log the error attempt if we have userId
    if (req.user?.userId && req.body.idNumber) {
      try {
        await BVNRateLimiter.logBVNAttempt(
          new Types.ObjectId(req.user.userId),
          req.body.idNumber,
          'failure',
          'unknown',
          false,
          false,
          'unknown',
          'unknown',
          `Internal server error: ${(error as Error).message}`,
        );
      } catch (logError) {
        console.error('Failed to log error attempt:', logError);
      }
    }
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: (error as Error).message,
    });
  }
};
