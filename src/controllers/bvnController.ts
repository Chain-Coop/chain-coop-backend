// controllers/qoreidController.ts
import { Request, Response } from 'express';
import { verifyBVNBooleanMatchQoreID } from '../services/bvnService';
import User from '../models/authModel';

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

    // Handle user tier update if EXACT_MATCH
    if (result.data?.summary?.bvn_match_check?.status === 'EXACT_MATCH') {
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
    }

    const simplifiedData = {
      status: result.data?.summary?.bvn_match_check?.status || 'unknown',
      firstnameMatch: result.data?.summary?.bvn_match_check?.fieldMatches?.firstname || false,
      lastnameMatch: result.data?.summary?.bvn_match_check?.fieldMatches?.lastname || false,
      verificationState: result.data?.status?.state || 'unknown',
      verificationStatus: result.data?.status?.status || 'unknown',
    };

    res.status(200).json({
      success: true,
      message: 'BVN boolean match verification successful and upgraded to tier 2',
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