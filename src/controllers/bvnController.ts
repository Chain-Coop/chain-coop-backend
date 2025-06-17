// controllers/qoreidController.ts
import { Request, Response } from 'express';
import { verifyBVNBooleanMatchQoreID } from '../services/bvnService';
import User from '../models/user';

export const verifyBVNBooleanMatchController = async (req: Request, res: Response) => {
  try {
    const {
      idNumber,
      firstname,
      lastname,
      dob,
      phone,
      email,
      gender,
    } = req.body;

    const userId = req.user?.userId;

    if (!idNumber || !firstname || !lastname) {
      return res.status(400).json({
        success: false,
        message: 'idNumber, firstname, and lastname are required',
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User not authenticated',
      });
    }

    interface BVNMatchResult {
      success: boolean;
      data?: {
        summary?: {
          bvn_match_check?: {
            status?: string;
            fieldMatches?: {
              firstname?: boolean;
              lastname?: boolean;
            };
          };
        };
        status?: {
          state?: string;
          status?: string;
        };
      };
      [key: string]: any;
    }

    const rawResult = await verifyBVNBooleanMatchQoreID({
      idNumber,
      firstname,
      lastname,
      dob,
      phone,
      email,
      gender,
    });

    const result: BVNMatchResult = {
      ...rawResult,
      data: rawResult.data as BVNMatchResult['data'],
    };

    if (!result.success) {
      return res.status(400).json(result);
    }

    // Handle user tier update if EXACT_MATCH
    if (result.data?.summary?.bvn_match_check?.status === 'EXACT_MATCH') {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

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
