import Withdrawal from '../models/withdrawal';
import Wallet from '../models/wallet';
import { BadRequestError, NotFoundError } from '../errors';

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


  export const getAllWithdrawals = async () => {
    return await Withdrawal.find().sort({ createdAt: -1 });
};

export const findWithdrawalRequests = async (userId: string) => {
    return await Withdrawal.find({ user: userId }).sort({ createdAt: -1 });
};

export const getUserBankAccounts = async (userId: string) => {
  // Find the wallet of the user
  const wallet = await Wallet.findOne({ user: userId });

  if (!wallet) {
    throw new NotFoundError("Wallet not found");
  }

  // Return the bank accounts (which are now stored in bankAccounts array)
  return {
    bankAccounts: wallet.bankAccounts, 
  };
};
