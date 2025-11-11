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
 * This marks the referral as 'claimable' instead of automatically crediting
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

  try {
    // Mark referral as claimable instead of completing it
    referral.status = 'claimable';
    referral.depositAmount = fundingAmount;
    referral.completedAt = new Date();
    await referral.save();

    // Mark user as having completed first funding
    user.hasCompletedFirstFunding = true;
    await user.save();

    return {
      rewardProcessed: true,
      message: `Referral reward is now claimable by referrer`,
    };
  } catch (error) {
    console.error('Error processing referral for claiming:', error);
    throw error;
  }
};

/**
 * Get claimable referrals for a user
 */
export const getClaimableReferrals = async (userId: string) => {
  const claimableReferrals = await Referral.find({
    referrer: userId,
    status: 'claimable',
  })
    .populate('referee', 'username email createdAt')
    .sort({ completedAt: -1 });

  const totalClaimableAmount = claimableReferrals.reduce(
    (sum, ref) => sum + ref.rewardAmount,
    0
  );

  return {
    claimableReferrals: claimableReferrals.map((ref) => ({
      id: ref._id,
      referee: ref.referee,
      rewardAmount: ref.rewardAmount,
      fundingAmount: ref.depositAmount,
      completedAt: ref.completedAt,
    })),
    totalClaimableAmount,
    count: claimableReferrals.length,
  };
};

/**
 * Claim a single referral reward
 */
export const claimSingleReferralReward = async (
  referrerId: string,
  referralId: string
) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Find the referral
    const referral = await Referral.findOne({
      _id: referralId,
      referrer: referrerId,
      status: 'claimable',
    }).session(session).populate('referee', 'username');

    if (!referral) {
      throw new NotFoundError('Claimable referral not found');
    }

    // Find referrer's wallet
    const referrerWallet = await Wallet.findOne({ user: referrerId }).session(session);
    if (!referrerWallet) {
      throw new NotFoundError('Referrer wallet not found');
    }

    // Update referral status
    referral.status = 'completed';
    await referral.save({ session });

    // Credit referrer's wallet
    referrerWallet.balance += referral.rewardAmount;
    if ('totalEarned' in referrerWallet) {
      (referrerWallet as any).totalEarned += referral.rewardAmount;
    }
    await referrerWallet.save({ session });

    // Create wallet history entry
    await WalletHistory.create(
      [
        {
          user: referrerId,
          amount: referral.rewardAmount,
          type: 'credit',
          label: `Referral reward claimed - ${(referral.referee as any).username} funded wallet`,
          ref: `REF-CLAIM-${referral._id}`,
          balanceAfter: referrerWallet.balance,
        },
      ],
      { session }
    );

    // Update referrer stats
    await User.findByIdAndUpdate(
      referrerId,
      {
        $inc: {
          completedReferrals: 1,
          totalReferralRewards: referral.rewardAmount,
        },
      },
      { session }
    );

    await session.commitTransaction();

    return {
      success: true,
      message: 'Referral reward claimed successfully',
      rewardAmount: referral.rewardAmount,
      newBalance: referrerWallet.balance,
    };
  } catch (error) {
    await session.abortTransaction();
    console.error('Error claiming referral reward:', error);
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Claim all claimable referral rewards at once
 */
export const claimAllReferralRewards = async (referrerId: string) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Find all claimable referrals
    const claimableReferrals = await Referral.find({
      referrer: referrerId,
      status: 'claimable',
    }).session(session).populate('referee', 'username');

    if (claimableReferrals.length === 0) {
      throw new BadRequestError('No claimable referrals found');
    }

    // Calculate total reward
    const totalReward = claimableReferrals.reduce(
      (sum, ref) => sum + ref.rewardAmount,
      0
    );

    // Find referrer's wallet
    const referrerWallet = await Wallet.findOne({ user: referrerId }).session(session);
    if (!referrerWallet) {
      throw new NotFoundError('Referrer wallet not found');
    }

    // Update all referrals to completed
    await Referral.updateMany(
      {
        referrer: referrerId,
        status: 'claimable',
      },
      {
        $set: { status: 'completed' },
      },
      { session }
    );

    // Credit referrer's wallet
    referrerWallet.balance += totalReward;
    if ('totalEarned' in referrerWallet) {
      (referrerWallet as any).totalEarned += totalReward;
    }
    await referrerWallet.save({ session });

    // Create wallet history entries for each referral
    const historyEntries = claimableReferrals.map((ref, index) => ({
      user: referrerId,
      amount: ref.rewardAmount,
      type: 'credit',
      label: `Referral reward - ${(ref.referee as any).username}`,
      ref: `REF-CLAIM-${ref._id}`,
      balanceAfter: referrerWallet.balance - totalReward + (index + 1) * ref.rewardAmount,
    }));

    await WalletHistory.insertMany(historyEntries, { session });

    // Update referrer stats
    await User.findByIdAndUpdate(
      referrerId,
      {
        $inc: {
          completedReferrals: claimableReferrals.length,
          totalReferralRewards: totalReward,
        },
      },
      { session }
    );

    await session.commitTransaction();

    return {
      success: true,
      message: 'All referral rewards claimed successfully',
      totalRewardAmount: totalReward,
      claimedCount: claimableReferrals.length,
      newBalance: referrerWallet.balance,
    };
  } catch (error) {
    await session.abortTransaction();
    console.error('Error claiming all referral rewards:', error);
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

  const claimableCount = await Referral.countDocuments({ 
    referrer: userId, 
    status: 'claimable' 
  });

  const completedCount = await Referral.countDocuments({ 
    referrer: userId, 
    status: 'completed' 
  });

  const claimableReferrals = await Referral.find({
    referrer: userId,
    status: 'claimable',
  }).populate('referee', 'username email');

  const totalClaimableAmount = claimableReferrals.reduce(
    (sum, ref) => sum + ref.rewardAmount,
    0
  );

  return {
    referralCode: user.username,
    referralLink: `${process.env.FRONTEND_URL}/sign-up?ref=${user.username}`,
    totalReferrals: user.totalReferrals,
    pendingReferrals: pendingCount,
    claimableReferrals: claimableCount,
    completedReferrals: completedCount,
    totalReferralRewards: user.totalReferralRewards,
    totalClaimableAmount,
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
  
  if (status && ['pending', 'claimable', 'completed', 'expired'].includes(status)) {
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