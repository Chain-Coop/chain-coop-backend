import User from '../models/user';

export async function ensureEmailServiceIndexes() {
  try {
    await (User as any).collection?.createIndex?.({ status: 1, kycLevel: 1 });
    await (User as any).collection?.createIndex?.({ plan: 1, kycLevel: 1 });
    await (User as any).collection?.createIndex?.({ verified: 1, kycLevel: 1 });
    await (User as any).collection?.createIndex?.({ paymentStatus: 1 });
    await (User as any).collection?.createIndex?.({ cryptoInterest: 1 });
    await (User as any).collection?.createIndex?.({ createdAt: 1 });
  } catch (e) {
    // optional: log and continue
  }
}