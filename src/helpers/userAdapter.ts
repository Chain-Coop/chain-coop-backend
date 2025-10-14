import { userFieldMap } from '../config/userFieldMap';

export function getField<T extends keyof typeof userFieldMap>(user: any, key: T) {
  const actual = userFieldMap[key];
  return user?.[actual];
}

export function buildSegmentQuery(criteria: any) {
  const q: any = {};
  if (criteria.membershipStatus) q[userFieldMap.membershipStatus] = { $in: criteria.membershipStatus };
  if (criteria.membershipPaymentStatus) q[userFieldMap.membershipPaymentStatus] = { $in: criteria.membershipPaymentStatus };
  if (criteria.membershipType) q[userFieldMap.membershipType] = { $in: criteria.membershipType };
  if (criteria.tier !== undefined) q[userFieldMap.Tier] = { $in: criteria.tier };
  if (criteria.isVerified !== undefined) q[userFieldMap.isVerified] = criteria.isVerified;
  if (criteria.isCrypto !== undefined) q[userFieldMap.isCrypto] = criteria.isCrypto;
  if (criteria.createdAfter || criteria.createdBefore) {
    q[userFieldMap.createdAt] = {};
    if (criteria.createdAfter) q[userFieldMap.createdAt].$gte = criteria.createdAfter;
    if (criteria.createdBefore) q[userFieldMap.createdAt].$lte = criteria.createdBefore;
  }
  return q;
}