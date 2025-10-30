import Referral, { IReferral } from '../models/referralModel';
import User from '../models/authModel';  
import Wallet from '../models/wallet';
import WalletHistory from '../models/walletHistory';
import { BadRequestError, NotFoundError } from '../errors';
import mongoose from 'mongoose';
import dotenv from "dotenv";

dotenv.config();

const REFERRAL_REWARD_AMOUNT = Number(process.env.REFERRAL_REWARD_AMOUNT) ;
const REFERRAL_MIN_FUNDING_AMOUNT = Number(process.env.REFERRAL_MIN_FUNDING_AMOUNT);  

/**
 * Validate referral code (username)for when a new user signs up
 */
export const validateReferralCode = async (referralCode: string) => {
  if (!referralCode) return null;

  const referrer = await User.findOne({ username: referralCode });  
  if (!referrer) {
    throw new BadRequestError('Invalid referral code');
  }

  return referrer;
};

/**
 * Create a referral record when a new user signs up with a referral code
 */
export const createReferralRecord = async (
  referrerId: string,
  refereeId: string,
  referralCode: string
) => {
  const referral = await Referral.create({
    referrer: referrerId,
    referee: refereeId,
    referralCode,
    status: 'pending',
    rewardAmount: REFERRAL_REWARD_AMOUNT,
  });

  // Increment total referrals for referrer
  await User.findByIdAndUpdate(referrerId, { 
    $inc: { totalReferrals: 1 },
  });

  return referral;
};

/**
 * Process referral reward when referred user funds their wallet for the FIRST time
 */
export const processReferralRewardOnWalletFunding = async (
  userId: string,
  fundingAmount: number,
  transactionReference: string
): Promise<{ rewardProcessed: boolean; message: string }> => {
  // Check if funding amount meets the minimum requirement
  if (fundingAmount < REFERRAL_MIN_FUNDING_AMOUNT) {
    return {
      rewardProcessed: false,
      message: `Funding amount (${fundingAmount}) is below minimum (${REFERRAL_MIN_FUNDING_AMOUNT})`,
    };
  }

  const user = await User.findById(userId); 
  if (!user || !user.referredByUsername) {
    return {
      rewardProcessed: false,
      message: 'User was not referred',
    };
  }

  if (user.hasCompletedFirstFunding) {
    return {
      rewardProcessed: false,
      message: 'User has already completed their first wallet funding',
    };
  }

  const referral = await Referral.findOne({
    referee: userId,
    status: 'pending',
  });

  if (!referral) {
    return {
      rewardProcessed: false,
      message: 'No pending referral found',
    };
  }

  // Start a session for transaction to ensure atomicity
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Find referrer's wallet
    const referrerWallet = await Wallet.findOne({ user: referral.referrer }).session(session);
    if (!referrerWallet) {
      throw new NotFoundError('Referrer wallet not found');
    }

    // Update referral status
    referral.status = 'completed';
    referral.depositAmount = fundingAmount;
    referral.completedAt = new Date();
    await referral.save({ session });

    // Credit referrer's wallet
    referrerWallet.balance += REFERRAL_REWARD_AMOUNT;
    if ('totalEarned' in referrerWallet) {
      (referrerWallet as any).totalEarned += REFERRAL_REWARD_AMOUNT;
    }
    await referrerWallet.save({ session });

    // Create wallet history entry for referrer
    await WalletHistory.create(
      [
        {
          user: referral.referrer,
          amount: REFERRAL_REWARD_AMOUNT,
          type: 'credit',
          label: `Referral reward - ${user.username} funded their wallet`,  
          ref: `REF-${referral._id}`,
          balanceAfter: referrerWallet.balance,
        },
      ],
      { session }
    );

    // Update referrer stats
    await User.findByIdAndUpdate(  
      referral.referrer,
      {
        $inc: {
          completedReferrals: 1,
          totalReferralRewards: REFERRAL_REWARD_AMOUNT,
        },
      },
      { session }
    );

    user.hasCompletedFirstFunding = true;
    await user.save({ session });

    await session.commitTransaction();

    return {
      rewardProcessed: true,
      message: `Referral reward of ${REFERRAL_REWARD_AMOUNT} credited to referrer`,
    };
  } catch (error) {
    await session.abortTransaction();
    console.error('Error processing referral reward:', error);
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Get referral statistics for a user
 */
export const getUserReferralStats = async (userId: string) => {
  const user = await User.findById(userId).select(  
    'username totalReferrals completedReferrals totalReferralRewards'
  );

  if (!user) {
    throw new NotFoundError('User not found');
  }

  const referrals = await Referral.find({ referrer: userId })
    .populate('referee', 'username email createdAt hasCompletedFirstFunding')
    .sort({ createdAt: -1 });

  const pendingCount = await Referral.countDocuments({ 
    referrer: userId, 
    status: 'pending' 
  });

  const completedCount = await Referral.countDocuments({ 
    referrer: userId, 
    status: 'completed' 
  });

  return {
    referralCode: user.username,
    referralLink: `${process.env.FRONTEND_URL }/sign-up?ref=${user.username}`,
    totalReferrals: user.totalReferrals,
    pendingReferrals: pendingCount,
    completedReferrals: completedCount,
    totalReferralRewards: user.totalReferralRewards,
    minFundingAmount: REFERRAL_MIN_FUNDING_AMOUNT,  
    referrals: referrals.map((ref) => ({
      id: ref._id,
      referee: ref.referee,
      status: ref.status,
      rewardAmount: ref.rewardAmount,
      fundingAmount: ref.depositAmount,  
      createdAt: ref.createdAt,
      completedAt: ref.completedAt,
    })),
  };
};

/**
 * Get all referrals with pagination (Admin only)
 */
export const getAllReferrals = async (
  page: number = 1, 
  limit: number = 10,
  status?: string
) => {
  const skip = (page - 1) * limit;
  const query: any = {};
  
  if (status && ['pending', 'completed', 'expired'].includes(status)) {
    query.status = status;
  }

  const referrals = await Referral.find(query)
    .populate('referrer', 'username email')
    .populate('referee', 'username email hasCompletedFirstFunding')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await Referral.countDocuments(query);

  const stats = await Referral.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalRewards: { $sum: '$rewardAmount' },
      },
    },
  ]);

  return {
    referrals,
    currentPage: page,
    totalPages: Math.ceil(total / limit),
    totalReferrals: total,
    statistics: stats,
  };
};

/**
 * Check if user can receive referral rewards (has not completed first wallet funding)
 */
export const canUserTriggerReferralReward = async (userId: string): Promise<boolean> => {
  const user = await User.findById(userId).select('hasCompletedFirstFunding referredByUsername'); 
  if (!user) return false;
  
  return !!(user.referredByUsername && !user.hasCompletedFirstFunding);
};