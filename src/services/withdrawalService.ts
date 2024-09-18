import Withdrawal from '../models/withdrawal';
import { BadRequestError } from '../errors';

export const createWithdrawalRequest = async (userId: string, amount: number, bankDetails: { accountNumber: string, bankCode: string }) => {
    if (amount <= 0) {
        throw new BadRequestError('Amount must be greater than zero');
    }

    const withdrawal = await Withdrawal.create({ user: userId, amount, bankDetails });
    return withdrawal;
};


// Find withdrawal by ID
export const findWithdrawalById = async (withdrawalId: string) => {
    return await Withdrawal.findById(withdrawalId);
  };
  
  // Update withdrawal status
  export const updateWithdrawalStatus = async (withdrawalId: string, status: string) => {
    return await Withdrawal.findByIdAndUpdate(
      withdrawalId,
      { status },
      { new: true }
    );
  };

export const findWithdrawalRequests = async (userId: string) => {
    return await Withdrawal.find({ user: userId }).sort({ createdAt: -1 });
};

// will add more functions for processing withdrawals