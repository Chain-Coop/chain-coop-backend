import { Request, Response } from "express";
import {
  createWithdrawalRequest,
  updateWithdrawalStatus,
  findWithdrawalById,
  getAllWithdrawals,
  getUserBankAccounts,
  LimitChecker,
} from "../services/withdrawalService";
import { BadRequestError, ForbiddenError } from "../errors";
import { StatusCodes } from "http-status-codes";
import axios from "axios";
import { sendEmail, EmailOptions } from "../utils/sendEmail";
import {
  createWalletHistoryService,
  findWalletService,
  validateWalletPin,
} from "../services/walletService";
import { findUser } from "../services/authService";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const ADMIN_EMAIL = process.env.EMAIL_ADDRESS;

if (!PAYSTACK_SECRET_KEY || !ADMIN_EMAIL) {
  throw new Error("Required environment variables are not defined.");
}

interface iPaystackBankVerificationResponse {
  status: boolean;
  message: string;
  data: {
    account_number: string;
    account_name: string;
    bank_id: string;
  };
}

// Request Withdrawal
export const requestWithdrawal = async (req: Request, res: Response) => {
  let userId = null;
  try {
    //@ts-ignore
    userId = req.user.userId;
    const { amount, accountNumber, bankCode, pin, bankName } = req.body;

    // Validate input
    if (!amount || !accountNumber || !bankCode || !pin || !bankName) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        status: StatusCodes.BAD_REQUEST,
        error:
          "Amount, account number, bank name, bank code and pin are required",
      });
    }

    // Validate the wallet
    const userWallet = await findWalletService({ user: userId });
    if (!userWallet) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ status: StatusCodes.NOT_FOUND, error: "Wallet not found" });
    }

    const user = await findUser("id", userId);

    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        status: StatusCodes.NOT_FOUND,
        error: "User not found",
      });
    }

    await LimitChecker(user, amount);

    if (user.isVerified === false) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        status: StatusCodes.BAD_REQUEST,
        error: "You are not verified to make this transaction.",
      });
    }

    if (userWallet.balance < amount) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        status: StatusCodes.BAD_REQUEST,
        error: "Insufficient balance",
      });
    }

    if (!userWallet.isPinCreated) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        status: StatusCodes.BAD_REQUEST,
        error: "Pin not set for the wallet",
      });
    }

    // Validate wallet pin
    const isPinValid = await validateWalletPin(userId, pin);
    if (!isPinValid) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        status: StatusCodes.UNAUTHORIZED,
        error: "Invalid wallet pin",
      });
    }

    // Verify the bank account details using Paystack
    const verifyResponse: iPaystackBankVerificationResponse = (
      (await axios.get("https://api.paystack.co/bank/resolve", {
        params: {
          account_number: accountNumber,
          bank_code: bankCode,
        },
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      })) as any
    ).data;
    //@ts-ignore

    const accountDetails = {
      accountName: verifyResponse.data.account_name,
      bankCode: verifyResponse.data.bank_id,
      accountNumber: verifyResponse.data.account_number,
      bankName,
    };

    // console.log(verifyResponse.data);
    if (!accountDetails) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        status: StatusCodes.BAD_REQUEST,
        error: "Invalid bank account details",
      });
    }

    // Create withdrawal request
    const withdrawal = await createWithdrawalRequest(
      userId,
      amount,
      accountDetails
    );

    userWallet.balance -= amount;
    await userWallet.save();

    await createWalletHistoryService({
      user: userId,
      amount: amount,
      type: "debit",
      label: "Withdrawal request",
      ref: withdrawal._id.toString(),
    });

    // Send email notification to admin
    const emailOptions: EmailOptions = {
      to: ADMIN_EMAIL,
      subject: "New Withdrawal Request",
      html: `
              <h3>New Withdrawal Request</h3>
              <p><strong>User ID:</strong> ${userId}</p>
              <p><strong>Amount:</strong> ${amount}</p>
              <p><strong>Account Number:</strong> ${accountNumber}</p>
              <p><strong>Bank Code:</strong> ${bankCode}</p>
              <p><strong>Status:</strong> Pending</p>
          `,
    };
    await sendEmail(emailOptions);

    // Respond with the created status
    return res.status(StatusCodes.CREATED).json({
      status: StatusCodes.CREATED,
      message: "Withdrawal request created successfully",
      withdrawal,
    });
  } catch (error) {
    return res
      .status(
        error instanceof BadRequestError
          ? StatusCodes.BAD_REQUEST
          : StatusCodes.INTERNAL_SERVER_ERROR
      )
      .json({
        status:
          error instanceof BadRequestError
            ? StatusCodes.BAD_REQUEST
            : StatusCodes.INTERNAL_SERVER_ERROR,
        error: error instanceof Error ? error.message : "Internal Server Error",
      });
  }
};

// Update Withdrawal Status (Admin only)
export const updateWithdrawalStatusController = async (
  req: Request,
  res: Response
) => {
  try {
    //@ts-ignore
    const user = req.user;
    const { withdrawalId } = req.params;
    const { status } = req.body;

    const validStatuses = [
      "pending",
      "completed",
      "accepted",
      "rejected",
      "failed",
    ];
    if (!validStatuses.includes(status)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        status: StatusCodes.BAD_REQUEST,
        error:
          "Invalid status. Status must be one of: pending, completed, failed",
      });
    }

    const withdrawal = await findWithdrawalById(withdrawalId);
    if (!withdrawal) {
      return res.status(StatusCodes.NOT_FOUND).json({
        status: StatusCodes.NOT_FOUND,
        error: "Withdrawal request not found",
      });
    }

    // ❗Don't proceed if it's not pending
    if (withdrawal.status !== "pending") {
      return res.status(StatusCodes.BAD_REQUEST).json({
        status: StatusCodes.BAD_REQUEST,
        message: "Withdrawal status cannot be changed once it's not pending",
      });
    }

    // Now update
const updatedWithdrawal = await updateWithdrawalStatus(withdrawalId, status);

if (!updatedWithdrawal) {
  return res.status(StatusCodes.NOT_FOUND).json({
    status: StatusCodes.NOT_FOUND,
    error: "Withdrawal request not found or could not be updated",
  });
}

    // Handle accepted
    if (status === "accepted") {
      updatedWithdrawal.status = "completed";
      await updatedWithdrawal.save();

      await createWalletHistoryService({
        user: updatedWithdrawal.user.toString(),
        amount: updatedWithdrawal.amount,
        type: "credit",
        label: "Withdrawal Accepted",
        ref: updatedWithdrawal._id.toString(),
      });

      return res.status(StatusCodes.OK).json({
        status: StatusCodes.OK,
        message: "Withdrawal accepted and completed",
      });
    }

    // Handle rejected
    if (status === "rejected" || status === "failed") {
      const userWallet = await findWalletService({
        user: updatedWithdrawal.user,
      });

      if (!userWallet) {
        return res.status(StatusCodes.NOT_FOUND).json({
          status: StatusCodes.NOT_FOUND,
          error: "Wallet not found",
        });
      }

      userWallet.balance += updatedWithdrawal.amount;
      await userWallet.save();

      await createWalletHistoryService({
        user: updatedWithdrawal.user.toString(),
        amount: updatedWithdrawal.amount,
        type: "credit",
        label:
          status === "rejected"
            ? "Withdrawal rejected"
            : "Withdrawal failed - refund",
        ref: updatedWithdrawal._id.toString(),
      });

      return res.status(StatusCodes.OK).json({
        status: StatusCodes.OK,
        message: `Withdrawal ${status} and amount refunded`,
      });
    }

    return res.status(StatusCodes.OK).json({
      status: StatusCodes.OK,
      message: "Withdrawal status updated",
      data: updatedWithdrawal,
    });
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: StatusCodes.INTERNAL_SERVER_ERROR,
      error: error instanceof Error ? error.message : "An error occurred",
    });
  }
};


// List all Withdrawals (Admin access)
export const listAllWithdrawals = async (req: Request, res: Response) => {
  try {
    const withdrawals = await getAllWithdrawals();
    return res.status(StatusCodes.OK).json({
      status: StatusCodes.OK, // HTTP status code in the response body
      message: "Withdrawals retrieved successfully",
      withdrawals,
    });
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: StatusCodes.INTERNAL_SERVER_ERROR,
      error: error instanceof Error ? error.message : "An error occurred",
    });
  }
};

export const getUserBankAccountsController = async (
  req: Request,
  res: Response
) => {
  try {
    //@ts-ignore
    const userId = req.user.userId;

    const bankAccounts = await getUserBankAccounts(userId);

    return res.status(StatusCodes.OK).json({
      status: StatusCodes.OK,
      message: "Bank accounts retrieved successfully",
      bankAccounts,
    });
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: StatusCodes.INTERNAL_SERVER_ERROR,
      error: error instanceof Error ? error.message : "An error occurred",
    });
  }
};
