import { Request, Response } from "express";
import {
  createWithdrawalRequest,
  updateWithdrawalStatus,
  findWithdrawalById,
  getAllWithdrawals,
  getUserBankAccounts,
} from "../services/withdrawalService";
import { BadRequestError, ForbiddenError } from "../errors";
import { StatusCodes } from "http-status-codes";
import axios from "axios";
import { sendEmail, EmailOptions } from "../utils/sendEmail";
import {
  findWalletService,
  validateWalletPin,
} from "../services/walletService";

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
    const { amount, accountNumber, bankCode, pin } = req.body;

    // Validate input
    if (!amount || !accountNumber || !bankCode || !pin) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        status: StatusCodes.BAD_REQUEST,
        error: "Amount, account number, bank code, and pin are required",
      });
    }

    // Validate the wallet
    const userWallet = await findWalletService({ user: userId });
    if (!userWallet) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ status: StatusCodes.NOT_FOUND, error: "Wallet not found" });
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
    };

    console.log(verifyResponse.data);
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

    // Validate the status input
    const validStatuses = ["pending", "completed", "failed"];
    if (!validStatuses.includes(status)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        status: StatusCodes.BAD_REQUEST,
        error:
          "Invalid status. Status must be one of: pending, completed, failed",
      });
    }

    // Find the withdrawal by its ID
    const withdrawal = await findWithdrawalById(withdrawalId);
    if (!withdrawal) {
      return res.status(StatusCodes.NOT_FOUND).json({
        status: StatusCodes.NOT_FOUND,
        error: "Withdrawal request not found",
      });
    }

    // Update the withdrawal status
    const updatedWithdrawal = await updateWithdrawalStatus(
      withdrawalId,
      status
    );

    return res.status(StatusCodes.OK).json({
      status: StatusCodes.OK,
      message: "Withdrawal status updated successfully",
      updatedWithdrawal,
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
