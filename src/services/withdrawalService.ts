import Withdrawal from "../models/withdrawal";
import Wallet from "../models/wallet";
import { BadRequestError, NotFoundError } from "../errors";
import { addtoLimit, getDailyTotal } from "./dailyServices";
import { findUser } from "./authService";
import { UserDocument } from "../models/authModel";

export const LimitChecker = async (user: UserDocument, amount: number) => {
  const total = await getDailyTotal(user._id as string);

  console.log(total);

  if (!user) {
    throw new NotFoundError("User not found");
  }

  let limit = 0;

  switch (user.Tier) {
    case 0:
      limit = 500;
      break;
    case 1:
      limit = 20000;
      break;
    case 2:
      limit = 200000;
      break;
    case 3:
      return;
    default:
      limit = 0;
      break;
  }
  if ((total?.withdrawal || 0) + amount > limit) {
    throw new BadRequestError("Withdrawal limit exceeded");
  }
};
export const createWithdrawalRequest = async (
  userId: string,
  amount: number,
  bankDetails: {
    accountNumber: string;
    bankCode: string;
    accountName: string;
    bankName: string;
  }
) => {
  if (amount <= 0) {
    throw new BadRequestError("Amount must be greater than zero");
  }

  await addtoLimit(userId, amount, "withdrawal");

  const withdrawal = await Withdrawal.create({
    user: userId,
    amount,
    bankDetails,
  });
  return withdrawal;
};

// Find withdrawal by ID
export const findWithdrawalById = async (withdrawalId: string) => {
  return await Withdrawal.findById(withdrawalId);
};

// Update withdrawal status
export const updateWithdrawalStatus = async (
  withdrawalId: string,
  status: string
) => {
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
