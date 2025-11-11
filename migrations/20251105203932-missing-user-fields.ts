// 20251105203932-missing-user-fields.ts
import { Db, Collection, ObjectId, FindCursor } from 'mongodb';

interface User {
  _id: ObjectId;
  username?: string;
  referralCode?: string | null;
  totalReferrals?: number;
  completedReferrals?: number;
  totalReferralRewards?: number;
  hasCompletedFirstFunding?: boolean;
  referredByUsername?: string | null;
  gender?: string | null;
  dateOfBirth?: Date | null;
  membershipType?: string;
}

export async function up(db: Db): Promise<void> {
  const users: Collection<User> = db.collection('users');
  console.log('Starting migration: add referral fields, normalize username, map membershipType');

  // Process users in batches
  const batchSize = 500;
  const total = await users.countDocuments();
  console.log(`Processing ${total} users in batches of ${batchSize}...`);
  const cursor: FindCursor<User> = users.find({});
  let processed = 0;
  const bulkOps: any[] = [];

  while (await cursor.hasNext()) {
    const user = await cursor.next();
    if (!user) continue;

    const updates: Partial<User> = {};

    // Add missing fields with default values
    if (user.referralCode === undefined || user.referralCode === null) {
      updates.referralCode = user.username ? 
        user.username.toString().toLowerCase().trim() : 
        user._id.toHexString().slice(-8);
    }
    if (user.totalReferrals === undefined) updates.totalReferrals = 0;
    if (user.completedReferrals === undefined) updates.completedReferrals = 0;
    if (user.totalReferralRewards === undefined) updates.totalReferralRewards = 0;
    if (user.hasCompletedFirstFunding === undefined) updates.hasCompletedFirstFunding = false;
    if (user.referredByUsername === undefined) updates.referredByUsername = null;
    if (user.gender === undefined) updates.gender = null;
    if (user.dateOfBirth === undefined) updates.dateOfBirth = null;

    // Map membership types
    if (user.membershipType) {
      const membershipMap: Record<string, string> = {
        'Explorer': 'individual',
        'Voyager': 'individual',
        'Pioneer': 'cooperate'
      };
      const newType = membershipMap[user.membershipType];
      if (newType && newType !== user.membershipType) {
        updates.membershipType = newType;
      }
    } else {
      updates.membershipType = 'individual';
    }

    // Normalize username (lowercase, trim)
    if (user.username) {
      const norm = user.username.toString().toLowerCase().trim();
      if (norm !== user.username) updates.username = norm;
    }

    if (Object.keys(updates).length > 0) {
      bulkOps.push({ 
        updateOne: { 
          filter: { _id: user._id }, 
          update: { $set: updates } 
        } 
      });
    }

    processed++;
    if (bulkOps.length >= batchSize) {
      await users.bulkWrite(bulkOps, { ordered: false });
      bulkOps.length = 0;
      console.log(`Processed ${processed}/${total} users...`);
    }
  }

  if (bulkOps.length > 0) {
    await users.bulkWrite(bulkOps, { ordered: false });
  }

  // Create referralCode index only
  console.log('Creating referralCode index...');
  try {
    const existingIndexes = await users.listIndexes().toArray();
    const indexExists = existingIndexes.some(idx => idx.name === 'referralCode_1');
    
    if (indexExists) {
      console.log(' referralCode_1 index already exists, skipping creation');
    } else {
      await users.createIndex(
        { referralCode: 1 },
        {
          unique: true,
          partialFilterExpression: { referralCode: { $type: "string" } }
        }
      );
      console.log(' Created partial unique index: referralCode_1');
    }
  } catch (err) {
    console.error('Failed to create referralCode index:', (err as Error).message);
  }

  console.log('Migration completed successfully');
}

export async function down(db: Db): Promise<void> {
  const users: Collection<User> = db.collection('users');
  console.log('Starting rollback...');

  // Drop indexes before modifying data
  try { 
    await users.dropIndex('referralCode_1'); 
    console.log(' Dropped referralCode_1 index');
  } catch (_) {
    console.log('referralCode_1 index does not exist, skipping...');
  }

  try { 
    await users.dropIndex('username_1'); 
    console.log('✓ Dropped username_1 index');
  } catch (_) {
    console.log('username_1 index does not exist, skipping...');
  }

  // Remove added fields
  await users.updateMany({}, {
    $unset: {
      referralCode: '',
      totalReferrals: '',
      completedReferrals: '',
      totalReferralRewards: '',
      hasCompletedFirstFunding: '',
      referredByUsername: '',
      gender: '',
      dateOfBirth: ''
    }
  });

  // Revert membership types
  await users.updateMany(
    { membershipType: 'individual' },
    { $set: { membershipType: 'Explorer' } }
  );
  await users.updateMany(
    { membershipType: 'cooperate' },
    { $set: { membershipType: 'Pioneer' } }
  );

  console.log('Rollback completed successfully');
}

module.exports = { up, down };