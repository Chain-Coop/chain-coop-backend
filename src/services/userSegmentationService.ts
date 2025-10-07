import User from '../models/user';
import logger from '../utils/logger';

export interface UserSegment {
  id: string;
  name: string;
  description: string;
  criteria: Record<string, any>;
  userCount?: number;
}

export interface SegmentationCriteria {
  membershipStatus?: 'active' | 'pending' | 'inactive';
  membershipPaymentStatus?: 'paid' | 'in-progress' | 'not_started';
  membershipType?: string;
  tier?: number;
  isVerified?: boolean;
  isCrypto?: boolean;
  emailPreferences?: {
    marketing?: boolean;
    notifications?: boolean;
    updates?: boolean;
  };
  createdAfter?: Date;
  createdBefore?: Date;
  lastActiveAfter?: Date;
  lastActiveBefore?: Date;
  hasWallet?: boolean;
}

class UserSegmentationService {
  private static instance: UserSegmentationService;

  public static getInstance(): UserSegmentationService {
    if (!UserSegmentationService.instance) {
      UserSegmentationService.instance = new UserSegmentationService();
    }
    return UserSegmentationService.instance;
  }

  /**
   * Get predefined user segments
   */
  public getAvailableSegments(): UserSegment[] {
    return [
      {
        id: 'all_users',
        name: 'All Users',
        description: 'All registered users',
        criteria: {},
      },
      {
        id: 'active_members',
        name: 'Active Members',
        description: 'Users with active membership status',
        criteria: { membershipStatus: 'active' },
      },
      {
        id: 'pending_members',
        name: 'Pending Members',
        description: 'Users with pending membership status',
        criteria: { membershipStatus: 'pending' },
      },
      {
        id: 'verified_users',
        name: 'Verified Users',
        description: 'Users who have completed verification',
        criteria: { isVerified: true },
      },
      {
        id: 'unverified_users',
        name: 'Unverified Users',
        description: 'Users who have not completed verification',
        criteria: { isVerified: false },
      },
      {
        id: 'crypto_users',
        name: 'Crypto Users',
        description: 'Users interested in cryptocurrency',
        criteria: { isCrypto: true },
      },
      {
        id: 'tier_1_users',
        name: 'Tier 1 Users',
        description: 'Users in tier 1',
        criteria: { tier: 1 },
      },
      {
        id: 'tier_2_users',
        name: 'Tier 2 Users',
        description: 'Users in tier 2',
        criteria: { tier: 2 },
      },
      {
        id: 'tier_3_users',
        name: 'Tier 3 Users',
        description: 'Users in tier 3',
        criteria: { tier: 3 },
      },
      {
        id: 'explorer_members',
        name: 'Explorer Members',
        description: 'Users with Explorer membership type',
        criteria: { membershipType: 'Explorer' },
      },
      {
        id: 'voyager_members',
        name: 'Voyager Members',
        description: 'Users with Voyager membership type',
        criteria: { membershipType: 'Voyager' },
      },
      {
        id: 'pioneer_members',
        name: 'Pioneer Members',
        description: 'Users with Pioneer membership type',
        criteria: { membershipType: 'Pioneer' },
      },
      {
        id: 'marketing_opted_in',
        name: 'Marketing Opted In',
        description: 'Users who opted in for marketing emails',
        criteria: { 'emailPreferences.marketing': true },
      },
      {
        id: 'notifications_opted_in',
        name: 'Notifications Opted In',
        description: 'Users who opted in for notification emails',
        criteria: { 'emailPreferences.notifications': true },
      },
      {
        id: 'updates_opted_in',
        name: 'Updates Opted In',
        description: 'Users who opted in for update emails',
        criteria: { 'emailPreferences.updates': true },
      },
      {
        id: 'paid_members',
        name: 'Paid Members',
        description: 'Users with paid membership status',
        criteria: { membershipPaymentStatus: 'paid' },
      },
      {
        id: 'payment_pending',
        name: 'Payment Pending',
        description: 'Users with payment in progress',
        criteria: { membershipPaymentStatus: 'in-progress' },
      },
      {
        id: 'new_users_30_days',
        name: 'New Users (30 Days)',
        description: 'Users who joined in the last 30 days',
        criteria: { createdAfter: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
      {
        id: 'inactive_users_90_days',
        name: 'Inactive Users (90+ Days)',
        description: 'Users who have been inactive for 90+ days',
        criteria: { lastActiveBefore: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
      },
    ];
  }

  /**
   * Get users based on segment criteria
   */
  public async getUsersBySegment(segmentId: string): Promise<any[]> {
    try {
      const segments = this.getAvailableSegments();
      const segment = segments.find(s => s.id === segmentId);
      
      if (!segment) {
        throw new Error(`Segment with ID ${segmentId} not found`);
      }

      const query = this.buildMongoQuery(segment.criteria);
      const users = await User.find(query).select('email firstName lastName membershipType membershipStatus Tier isVerified');
      
      logger.info(`Found ${users.length} users for segment: ${segment.name}`);
      return users;
    } catch (error) {
      logger.error(`Error getting users for segment ${segmentId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Get user count for a specific segment
   */
  public async getUserCountBySegment(segmentId: string): Promise<number> {
    try {
      const segments = this.getAvailableSegments();
      const segment = segments.find(s => s.id === segmentId);
      
      if (!segment) {
        throw new Error(`Segment with ID ${segmentId} not found`);
      }

      const query = this.buildMongoQuery(segment.criteria);
      const count = await User.countDocuments(query);
      
      return count;
    } catch (error) {
      logger.error(`Error getting user count for segment ${segmentId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Get users based on custom criteria
   */
  public async getUsersByCustomCriteria(criteria: SegmentationCriteria): Promise<any[]> {
    try {
      const query = this.buildMongoQuery(criteria);
      const users = await User.find(query).select('email firstName lastName membershipType membershipStatus Tier isVerified');
      
      logger.info(`Found ${users.length} users for custom criteria`);
      return users;
    } catch (error) {
      logger.error(`Error getting users for custom criteria: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Get user count for custom criteria
   */
  public async getUserCountByCustomCriteria(criteria: SegmentationCriteria): Promise<number> {
    try {
      const query = this.buildMongoQuery(criteria);
      const count = await User.countDocuments(query);
      
      return count;
    } catch (error) {
      logger.error(`Error getting user count for custom criteria: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Build MongoDB query from segmentation criteria
   */
  private buildMongoQuery(criteria: Record<string, any>): Record<string, any> {
    const query: Record<string, any> = {};

    // Handle basic field matching
    if (criteria.membershipStatus) {
      query.membershipStatus = criteria.membershipStatus;
    }

    if (criteria.membershipPaymentStatus) {
      query.membershipPaymentStatus = criteria.membershipPaymentStatus;
    }

    if (criteria.membershipType) {
      query.membershipType = criteria.membershipType;
    }

    if (criteria.tier !== undefined) {
      query.Tier = criteria.tier;
    }

    if (criteria.isVerified !== undefined) {
      query.isVerified = criteria.isVerified;
    }

    if (criteria.isCrypto !== undefined) {
      query.isCrypto = criteria.isCrypto;
    }

    // Handle email preferences
    if (criteria['emailPreferences.marketing'] !== undefined) {
      query['emailPreferences.marketing'] = criteria['emailPreferences.marketing'];
    }

    if (criteria['emailPreferences.notifications'] !== undefined) {
      query['emailPreferences.notifications'] = criteria['emailPreferences.notifications'];
    }

    if (criteria['emailPreferences.updates'] !== undefined) {
      query['emailPreferences.updates'] = criteria['emailPreferences.updates'];
    }

    // Handle date ranges
    if (criteria.createdAfter || criteria.createdBefore) {
      query.createdAt = {};
      if (criteria.createdAfter) {
        query.createdAt.$gte = criteria.createdAfter;
      }
      if (criteria.createdBefore) {
        query.createdAt.$lte = criteria.createdBefore;
      }
    }

    if (criteria.lastActiveAfter || criteria.lastActiveBefore) {
      query.lastActiveAt = {};
      if (criteria.lastActiveAfter) {
        query.lastActiveAt.$gte = criteria.lastActiveAfter;
      }
      if (criteria.lastActiveBefore) {
        query.lastActiveAt.$lte = criteria.lastActiveBefore;
      }
    }

    return query;
  }

  /**
   * Get segments with user counts
   */
  public async getSegmentsWithCounts(): Promise<UserSegment[]> {
    const segments = this.getAvailableSegments();
    const segmentsWithCounts = await Promise.all(
      segments.map(async (segment) => {
        try {
          const userCount = await this.getUserCountBySegment(segment.id);
          return { ...segment, userCount };
        } catch (error) {
          logger.error(`Error getting count for segment ${segment.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          return { ...segment, userCount: 0 };
        }
      })
    );

    return segmentsWithCounts;
  }

  /**
   * Validate segment criteria
   */
  public validateSegmentCriteria(criteria: SegmentationCriteria): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate membership status
    if (criteria.membershipStatus && !['active', 'pending', 'inactive'].includes(criteria.membershipStatus)) {
      errors.push('Invalid membership status. Must be: active, pending, or inactive');
    }

    // Validate membership payment status
    if (criteria.membershipPaymentStatus && !['paid', 'in-progress', 'not_started'].includes(criteria.membershipPaymentStatus)) {
      errors.push('Invalid membership payment status. Must be: paid, in-progress, or not_started');
    }

    // Validate tier
    if (criteria.tier !== undefined && (criteria.tier < 1 || criteria.tier > 3)) {
      errors.push('Invalid tier. Must be between 1 and 3');
    }

    // Validate date ranges
    if (criteria.createdAfter && criteria.createdBefore && criteria.createdAfter > criteria.createdBefore) {
      errors.push('createdAfter must be before createdBefore');
    }

    if (criteria.lastActiveAfter && criteria.lastActiveBefore && criteria.lastActiveAfter > criteria.lastActiveBefore) {
      errors.push('lastActiveAfter must be before lastActiveBefore');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

export default UserSegmentationService;