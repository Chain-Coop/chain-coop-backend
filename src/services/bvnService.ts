// services/qoreidService.ts
import axios from 'axios';
import BVNLog from '../models/bvnModel';
import { Types } from 'mongoose';

interface QoreIDBooleanMatchParams {
  idNumber: string; // BVN
  firstname: string;
  lastname: string;
  dob?: string;
  phone?: string;
  email?: string;
  gender?: string;
}

interface AuthTokenResponse {
  accessToken: string;
  expiresIn: number; // in seconds
}

// In-memory token cache
let cachedToken: string | null = null;
let tokenExpiry: number | null = null;

const getAuthToken = async (): Promise<string> => {
  const now = Date.now();

  // Return cached token if still valid (allow 1 min buffer)
  if (cachedToken && tokenExpiry && now < tokenExpiry - 60000) {
    return cachedToken;
  }

  try {
    const response = await axios.post<AuthTokenResponse>('https://api.qoreid.com/token', {
      clientId: process.env.QOREID_CLIENT_ID,
      secret: process.env.QOREID_SECRET_KEY
    });

    const { accessToken, expiresIn } = response.data;

    cachedToken = accessToken;
    tokenExpiry = now + expiresIn * 1000;

    return accessToken;
  } catch (error: any) {
    console.error('QoreID Auth Token Error:', error.response?.data || error.message);
    throw new Error('Failed to get QoreID auth token');
  }
};

export const verifyBVNBooleanMatchQoreID = async (params: QoreIDBooleanMatchParams) => {
  const { idNumber, ...rest } = params;

  try {
    const token = await getAuthToken();

    const response = await axios.post(
      `https://api.qoreid.com/v1/ng/identities/bvn-match/${idNumber}`,
      rest,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      success: true,
      message: 'BVN boolean match verification successful',
      data: response.data
    };
  } catch (error: any) {
    console.error('QoreID Boolean Match Error:', error.response?.data || error.message);

    return {
      success: false,
      message: error.response?.data?.message || 'BVN match verification failed',
      error: error.response?.data || null
    };
  }
};

interface RateLimitResult {
  canAttempt: boolean;
  remainingAttempts: number;
  nextAttemptTime?: Date;
  message?: string;
}

export class BVNRateLimiter {
  private static readonly MAX_ATTEMPTS = 2;
  private static readonly COOLDOWN_HOURS = 24 * 60 * 60 * 1000;

  /**
   * Check if user can make a BVN verification attempt
   */
  static async canUserAttemptBVN(userId: Types.ObjectId): Promise<RateLimitResult> {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - this.COOLDOWN_HOURS);

    // Count failed attempts in the last 24 hours
    const failedAttempts = await BVNLog.countDocuments({
      userId,
      attemptStatus: 'failure',
      attemptDate: { $gte: last24Hours }
    });

    // If user has failed attempts, check if they've exceeded the limit
    if (failedAttempts >= this.MAX_ATTEMPTS) {
      // Find the earliest failed attempt in the last 24 hours
      const earliestFailedAttempt = await BVNLog.findOne({
        userId,
        attemptStatus: 'failure',
        attemptDate: { $gte: last24Hours }
      }).sort({ attemptDate: 1 });

      if (earliestFailedAttempt) {
        const nextAttemptTime = new Date(
          earliestFailedAttempt.attemptDate.getTime() + this.COOLDOWN_HOURS
        );

        // If cooldown period hasn't passed yet
        if (now < nextAttemptTime) {
          const formattedTime = this.formatNextAttemptTime(nextAttemptTime);
          return {
            canAttempt: false,
            remainingAttempts: 0,
            nextAttemptTime,
            message: `You have exceeded the maximum number of BVN verification attempts. Please try again after ${formattedTime}.`
          };
        }
      }
    }

    // Check if user already has a successful verification
    const successfulAttempt = await BVNLog.findOne({
      userId,
      attemptStatus: 'success',
      matchStatus: 'EXACT_MATCH'
    });

    if (successfulAttempt) {
      return {
        canAttempt: false,
        remainingAttempts: 0,
        message: 'BVN has already been successfully verified for this account.'
      };
    }

    return {
      canAttempt: true,
      remainingAttempts: this.MAX_ATTEMPTS - failedAttempts
    };
  }

  /**
   * Log a BVN verification attempt
   */
  static async logBVNAttempt(
    userId: Types.ObjectId,
    bvnNumber: string,
    attemptStatus: 'success' | 'failure',
    status: string,
    firstnameMatch: boolean,
    lastnameMatch: boolean,
    verificationState: string,
    verificationStatus: string,
    errorMessage?: string,
  ): Promise<void> {
    const bvnLog = new BVNLog({
      userId: userId,
      bvnNumber: bvnNumber,
      attemptStatus: attemptStatus,
      matchStatus: status,
      firstnameMatch: firstnameMatch,
      lastnameMatch: lastnameMatch,
      verificationState: verificationState,
      verificationStatus: verificationStatus,
      errorMessage: errorMessage,
      attemptDate: new Date()
    });

    await bvnLog.save();
  }

  /**
   * Format the next attempt time in a user-friendly way
   */
  private static formatNextAttemptTime(nextAttemptTime: Date): string {
    const now = new Date();
    const diffMs = nextAttemptTime.getTime() - now.getTime();
    const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.ceil(diffMs / (1000 * 60));

    if (diffHours >= 1) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    } else if (diffMinutes >= 1) {
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
    } else {
      return 'a few moments';
    }
  }
}
