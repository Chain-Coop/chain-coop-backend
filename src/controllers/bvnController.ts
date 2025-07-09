// controllers/qoreidController.ts
import { Request, Response } from 'express';
import { verifyBVNBooleanMatchQoreID } from '../services/bvnService';
import User from '../models/authModel';
import { StatusCodes } from 'http-status-codes';

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

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    if (
      user.unsuccessfulBVNAttempts.length >= 2 &&
      user.unsuccessfulBVNAttempts[0] >= twentyFourHoursAgo
    ) {

      const firstAttempt = user.unsuccessfulBVNAttempts[0];
      const futureTime = new Date(firstAttempt.getTime() + 24 * 60 * 60 * 1000);

      const formattedTime = futureTime.toLocaleString('en-US', {
        timeZone: 'Africa/Lagos',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
      });

      return res.status(StatusCodes.FORBIDDEN).json({
        success: false,
        message: `You have exceeded the maximum number of BVN verification attempts. Please try again after ${formattedTime}.`,
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

    if (!result.success) {
      return res.status(400).json(result);
    }

    const matchStatus = result.data?.summary?.bvn_match_check?.status;

    const simplifiedData = {
      status: matchStatus || 'unknown',
      firstnameMatch: result.data?.summary?.bvn_match_check?.fieldMatches?.firstname || false,
      lastnameMatch: result.data?.summary?.bvn_match_check?.fieldMatches?.lastname || false,
      verificationState: result.data?.status?.state || 'unknown',
      verificationStatus: result.data?.status?.status || 'unknown',
    };

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

    user.unsuccessfulBVNAttempts.push(new Date());
    if (user.unsuccessfulBVNAttempts.length > 2) {
      user.unsuccessfulBVNAttempts.shift();
    }
    await user.save();

    // If not EXACT_MATCH
    return res.status(400).json({
      success: false,
      message: 'BVN verification failed. Names do not match.',
      data: simplifiedData,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: (error as Error).message,
    });
  }
};
