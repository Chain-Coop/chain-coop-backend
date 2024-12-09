import axios from "axios";
import { BadRequestError, NotFoundError } from "../errors";
import Wallet from "../models/wallet";
import WalletHistory from "../models/walletHistory";
import bcrypt from "bcryptjs";
import logger from "../utils/logger";
import { UserDocument } from "../models/authModel";
import { addtoLimit, getDailyTotal } from "./dailyServices";
import { findUser } from "./authService";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY!;
const PAYSTACK_BANK_VERIFICATION_URL = "https://api.paystack.co/bank/resolve";
const PAYSTACK_BASE_URL = "https://api.paystack.co";

export interface iWallet {
  balance?: number;
  totalWithdrawn?: number;
  pin?: string;
  totalEarned?: number;
  user?: string;
  isPinCreated?: boolean;
  bankDetails?: {
    accountNumber: string;
    bankCode: string;
    bankName: string;
  };
}

export interface iWalletHistory {
  amount: number;
  label: string;
  type: string;
  ref: string;
  user: string;
}

export interface WebHookDataProps {
  amount: number;
  reference: string;
  id: string;
  paid_at: Date;
  channel: string;
  customer: {
    email: string;
  };
}

export const createWalletService = async (payload: iWallet) => {
  console.log("Creating wallet with payload:", payload);
  return await Wallet.create(payload);
};

export const DepositLimitChecker = async (
  user: UserDocument,
  amount: number
) => {
  const total = await getDailyTotal(user._id as string);

  if (!user) {
    throw new NotFoundError("User not found");
  }

  let limit = 0;

  switch (user.Tier) {
    case 0:
      limit = 20000;
      break;
    case 1:
      limit = 50000;
      break;
    default:
      limit = 0;
      break;
  }
  if ((total?.deposit || 0) + amount > limit) {
    throw new BadRequestError("Deposit limit exceeded");
  }
};

export const createPin = async (id: any, payload: iWallet) => {
  const { pin } = payload;
  const wallet = await Wallet.findOne({ _id: id });
  if (!wallet) {
    throw new BadRequestError("Wallet not found");
  }

  wallet.pin = pin!;
  wallet.isPinCreated = true;
  await wallet.save();
};

export const findWalletService = async (payload: any) => {
  const wallet = await Wallet.findOne(payload);
  return wallet;
};

export const updateWalletService = async (id: any, payload: iWallet) => {
  console.log("Updating wallet with ID:", id, "Payload:", payload);
  const updatedWallet = await Wallet.findOneAndUpdate({ _id: id }, payload, {
    new: true,
    runValidators: true,
  });
  console.log("Updated wallet:", updatedWallet);
  return updatedWallet;
};

export const createWalletHistoryService = async (payload: iWalletHistory) =>
  await WalletHistory.create(payload);

export const findWalletHistoryService = async (payload: any) =>
  await WalletHistory.find(payload).sort({ createdAt: -1 });

export const findSingleWalletHistoryService = async (payload: any) =>
  await WalletHistory.findOne(payload);

export const verifyBankDetailsService = async (
  accountNumber: string,
  bankCode: string,
  userId: string,
  bankName: string
) => {
  const response: any = await axios.get(PAYSTACK_BANK_VERIFICATION_URL, {
    params: {
      account_number: accountNumber,
      bank_code: bankCode,
    },
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
    },
  });

  if (!response.data.data) {
    throw new BadRequestError("Bank verification failed");
  }

  const { account_name, bank_id } = response.data.data;

  const wallet = await Wallet.findOne({ user: userId });
  if (!wallet) {
    throw new BadRequestError("Wallet not found");
  }

  const isAccountExisting = wallet.bankAccounts.some(
    (account: any) => account.accountNumber === accountNumber
  );

  if (isAccountExisting) {
    throw new BadRequestError("Account already exists");
  }

  // Add the new bank account to the bankAccounts array
  wallet.bankAccounts.push({
    accountNumber,
    bankCode,
    accountName: account_name,
    bankId: bank_id,
    bankName,
  });
  // Save the updated wallet with the new bank account
  await wallet.save();
  return response.data; // Return the full verification response from Paystack
};

export const verifyAccountDetailsService = async (
  accountNumber: string,
  bankCode: string
) => {
  try {
    const response: any = await axios.get(PAYSTACK_BANK_VERIFICATION_URL, {
      params: {
        account_number: accountNumber,
        bank_code: bankCode,
      },
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    });

    return response.data;
  } catch (error: any) {
    console.error(error);
    throw new BadRequestError("Bank verification failed");
  }
};

// Function to validate wallet pin
export const validateWalletPin = async (userId: string, pin: string) => {
  try {
    const wallet = await Wallet.findOne({ user: userId });

    if (!wallet) {
      console.error(`No wallet found for user ID: ${userId}`);
      throw new BadRequestError("Wallet not found.");
    }

    if (!wallet.pin) {
      console.error(`Wallet pin not set for user ID: ${userId}`);
      throw new BadRequestError("Pin not set for the wallet.");
    }

    console.log(`Comparing pin: ${pin} with hashed pin: ${wallet.pin}`);

    // Compare the provided pin with the stored hashed pin
    const isMatch = await bcrypt.compare(pin, wallet.pin);
    console.log(`Pin match result: ${isMatch}`);

    return isMatch;
  } catch (error) {
    console.error(`Error validating pin for user ID: ${userId}`, error);
    throw new BadRequestError("Error validating wallet pin.");
  }
};

//GET ALL FUNDED PROJECTS
export const getUserFundedProjectsService = async (userId: string) => {
  const wallet = await Wallet.findOne({ user: userId }).populate(
    "fundedProjects.projectId",
    "title description documentUrl status"
  );

  if (!wallet) {
    throw new NotFoundError("Wallet not found");
  }
  return wallet;
};

//Set Preferred Card
export const setPreferredCardService = async (
  userId: string,
  authCode: string
) => {
  const wallet = await Wallet.findOne({ user: userId });
  if (!wallet) {
    throw new NotFoundError("Wallet not found");
  }
  wallet.Card = {
    data: authCode,
    failedAttempts: 0,
  };
  await wallet.save();
  return wallet;
};

//Charge Card
export const chargeCardService = async (
  authCode: string,
  email: string,
  amount: number,
  metadata?: any
) => {
  try {
    const charge = await axios.post(
      `${PAYSTACK_BASE_URL}/transaction/charge_authorization`,
      {
        authorization_code: authCode,
        //@ts-ignore
        email: email,
        amount: amount * 100,
        metadata,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    return charge.data;
  } catch (error) {
    //@ts-ignore
    return error;
  }
};

export const verifyPaymentService = async (reference: string) => {
  if (!reference) {
    throw new BadRequestError("Payment reference is required");
  }

  const isRefExist = await findSingleWalletHistoryService({ ref: reference });
  if (isRefExist) {
    throw new BadRequestError("Payment already verified");
  }
  try {
    const response: any = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );
    const paymentData = response.data.data;
    if (paymentData.status === "success") {
      const { amount, customer } = paymentData;
      const user = await findUser("email", customer.email);
      if (!user) {
        return;
      }

      const wallet = await findWalletService({ user: user?.id });
      if (!wallet) {
        return;
      }

      await updateWalletService(wallet._id, {
        balance: wallet.balance + amount / 100,
      });

      const historyPayload: iWalletHistory = {
        amount: amount,
        label: "Wallet top up via Paystack",
        ref: reference,
        type: "credit",
        user: user._id as string,
      };

      await createWalletHistoryService(historyPayload);

      await addtoLimit(user.id, amount / 100, "deposit");

      return;
    } else {
      return;
    }
  } catch (error: any) {
    return;
  }
};
