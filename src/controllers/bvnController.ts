// controllers/qoreidController.ts
import { Request, Response } from 'express';
import { BVNRateLimiter, verifyBVNBooleanMatchQoreID } from '../services/bvnService';
import User from '../models/authModel';
import { StatusCodes } from 'http-status-codes';
import { Types } from 'mongoose';
import VantServices from '../services/vantWalletServices';
import { BadRequestError, NotFoundError } from '../errors'; 
import { getUserDetails } from '../services/authService'; 

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
    const { idNumber, manualFirstName, manualLastName } = req.body;
    const userId = req.user?.userId;

    // User authentication validation
    if (!userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: 'User authentication required',
      });
    }

    const user = await getUserDetails(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Input validation
    if (!idNumber) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'BVN is required',
      });
    }

    if (!/^\d{11}$/.test(idNumber)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'BVN must be 11 digits',
      });
    }

    // Validate user info required for wallet creation
    if (!user.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Valid email address is required for wallet creation',
      });
    }

    if (!user.phoneNumber || !/^\+?\d{10,14}$/.test(user.phoneNumber)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Valid phone number is required for wallet creation',
      });
    }

    // Check for existing wallet to avoid unnecessary verification
    const existingWallet = await VantServices.getUserReservedWallet(userId);
    if (existingWallet) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'User already has a reserved wallet',
        wallet: {
          walletName: existingWallet.walletName,
          accountNumber: existingWallet.accountNumbers[0]?.account_number,
          bank: existingWallet.accountNumbers[0]?.bank,
          status: existingWallet.status
        }
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

    // Determine names to use for verification
    const firstNameToUse = manualFirstName?.trim() || user.firstName;
    const lastNameToUse = manualLastName?.trim() || user.lastName;
    const isManualAttempt = !!(manualFirstName || manualLastName);

    if (!firstNameToUse || !lastNameToUse) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'First name and last name are required for BVN verification',
      });
    }

    // Perform BVN verification
    const rawResult = await verifyBVNBooleanMatchQoreID({
      idNumber,
      firstname: firstNameToUse,
      lastname: lastNameToUse,
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
      namesUsed: {
        firstName: firstNameToUse,
        lastName: lastNameToUse,
      },
      isManualAttempt,
    };

    // Determine verification success - only EXACT_MATCH proceeds
    const isVerificationSuccessful = result.success && matchStatus === 'EXACT_MATCH';
    let attemptStatus: 'success' | 'failure' = isVerificationSuccessful ? 'success' : 'failure';
    let errorMessage: string | undefined;

    if (!isVerificationSuccessful) {
      errorMessage = matchStatus !== 'EXACT_MATCH' 
        ? 'BVN verification failed. Names do not match exactly.'
        : result?.message || 'BVN verification failed';
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
      isManualAttempt ? { firstName: firstNameToUse, lastName: lastNameToUse } : undefined
    );

    // Return error if BVN verification fails - no wallet creation
    if (!isVerificationSuccessful) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: errorMessage,
        data: simplifiedData,
        remainingAttempts: rateLimitResult.remainingAttempts - 1,
        allowManualCorrection: !isManualAttempt,
        userNames: !isManualAttempt ? { 
          firstName: user.firstName, 
          lastName: user.lastName 
        } : undefined,
      });
    }

    // Handle tier upgrade
    let tierUpgraded = false;
    let previousTier = user.Tier;

    if (user.Tier !== 2) {
      if (user.Tier !== 1) {
        return res.status(400).json({
          success: false,
          message: 'User must be Tier 1 to upgrade to Tier 2',
        });
      }

      user.Tier = 2;
      await user.save();
      tierUpgraded = true;
    }

    // Create wallet using verified idNumber
    try {
      const walletData = await VantServices.generateReservedWallet(
        user.email,
        user.phoneNumber,
        idNumber
      );

      if (!walletData) {
        throw new Error('Vant service failed to generate wallet');
      }

      const wallet = await VantServices.createReservedWallet(userId, user.email);

      return res.status(StatusCodes.OK).json({
        success: true,
        message: tierUpgraded 
          ? 'BVN verified successfully, user upgraded to Tier 2, and Vant wallet creation is being processed'
          : 'BVN verified successfully and Vant wallet createion is being processed',
        data: {
          bvnVerification: {
            ...simplifiedData,
            verified: true
          },
          tierUpgrade: {
            upgraded: tierUpgraded,
            previousTier: previousTier,
            currentTier: user.Tier
          },
          wallet: {
            walletName: wallet.walletName,
            accountName: wallet.accountNumbers[0]?.account_name,
            accountNumber: wallet.accountNumbers[0]?.account_number,
            bank: wallet.accountNumbers[0]?.bank,
            status: wallet.status,
            walletBalance: wallet.walletBalance || 0
          }
        },
      });

    } catch (walletError) {
      // BVN verification succeeded but wallet creation failed
      return res.status(StatusCodes.PARTIAL_CONTENT).json({
        success: true,
        message: 'BVN verified and user upgraded, but Vant wallet creation failed',
        data: {
          bvnVerification: {
            ...simplifiedData,
            verified: true
          },
          tierUpgrade: {
            upgraded: tierUpgraded,
            previousTier: previousTier,
            currentTier: user.Tier
          },
          wallet: null,
          walletError: (walletError as Error).message
        },
        suggestion: 'Contact support to complete wallet creation'
      });
    }

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
