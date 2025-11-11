import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import {
  getUserReferralStats,
  getAllReferrals,
  validateReferralCode,
} from "../services/referralService";
import { BadRequestError } from "../errors";
import { findUser } from "../services/authService";
import dotenv from "dotenv";

dotenv.config();

/**
 * Get current user's referral statistics and history
 * GET /api/v1/referrals/my-referrals
 */
export const getMyReferrals = async (req: Request, res: Response) => {
  try {
    //@ts-ignore
    const userId = req.user.userId;

    const stats = await getUserReferralStats(userId);

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Referral statistics retrieved successfully",
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching referral stats:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: error instanceof Error ? error.message : "Internal Server Error",
    });
  }
};

/**
 * Validate a referral code (public endpoint for registration form validation)
 * GET /api/v1/referrals/validate?referralCode=username
 */
export const checkReferralCode = async (req: Request, res: Response) => {
  try {
    const { referralCode } = req.query;

    if (!referralCode || typeof referralCode !== "string") {
      throw new BadRequestError("Referral code is required");
    }

    const referrer = await validateReferralCode(referralCode);

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Referral code is valid",
      data: {
        valid: true,
        referrerUsername: referrer?.username,
      },
    });
  } catch (error) {
    if (error instanceof BadRequestError) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: error.message,
        data: { valid: false },
      });
    }
    
    console.error("Error validating referral code:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: error instanceof Error ? error.message : "Internal Server Error",
    });
  }
};

/**
 * Get all referrals (Admin only)
 * GET /api/v1/referrals/admin/all
 */
export const getAllReferralsAdmin = async (req: Request, res: Response) => {
  try {
    //@ts-ignore
    const { role } = req.user;

    if (role !== "admin") {
      return res.status(StatusCodes.FORBIDDEN).json({
        success: false,
        error: "Access denied. Admin only.",
      });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;

    const result = await getAllReferrals(page, limit, status);

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Referrals retrieved successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error fetching all referrals:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: error instanceof Error ? error.message : "Internal Server Error",
    });
  }
};

/**
 * Get referral configuration (to display on frontend)
 * GET /api/v1/referrals/config
 */
export const getReferralConfig = async (req: Request, res: Response) => {
  try {
    const config = {
      rewardAmount: parseFloat(process.env.REFERRAL_REWARD_AMOUNT || "1000"),
      minFundingAmount: parseFloat(
        process.env.REFERRAL_MIN_FUNDING_AMOUNT || "5000"
      ),
      currency: process.env.CURRENCY || "NGN",
      description: "Fund your wallet to earn referral rewards for your referrer"
    };

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Referral configuration retrieved successfully",
      data: config,
    });
  } catch (error) {
    console.error("Error fetching referral config:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: error instanceof Error ? error.message : "Internal Server Error",
    });
  }
};

/**
 * Get a user's referral code and link
 * GET /api/v1/referrals/my-code
 */
export const getReferralCode = async (req: Request, res: Response) => {
  try {
    //@ts-ignore
    const userId = req.user.userId;

    const user = await findUser("id", userId);
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Referral code retrieved successfully",
      data: {
        referralCode: user.username,
        referralLink: `${process.env.FRONTEND_URL }/sign-up?ref=${user.username}`,
      },
    });
  } catch (error) {
    console.error("Error fetching referral code:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to get referral code",
      error: error instanceof Error ? error.message : "Internal Server Error",
    });
  }
};