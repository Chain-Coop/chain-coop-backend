// services/LogFailedTransaction.ts

import { FailedTransaction } from '../models/logs';

export async function logFailedTransaction({
    type,
    reference,
    reason,
    data,
    userId,
    walletId,
}: {
    type: 'withdrawal' | 'deposit';
    reference: string;
    reason: string;
    data: any;
    userId?: any;
    walletId?: any;
}) {
    try {
        await FailedTransaction.create({
            type,
            reference,
            reason,
            data,
            userId,
            walletId,
        });
    } catch (err: any) {
        console.error('Failed to log failed transaction:', err.message);
    }
}
