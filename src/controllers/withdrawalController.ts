import { Request, Response } from "express";
import { createWithdrawalRequest, updateWithdrawalStatus, findWithdrawalById } from "../services/withdrawalService";
import { BadRequestError, ForbiddenError } from "../errors";
import { StatusCodes } from "http-status-codes";
import axios from "axios";
import { sendEmail, EmailOptions } from "../utils/sendEmail";
import { getAllWithdrawals } from "../services/withdrawalService";

// Ensure these environment variables are defined
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_KEY;
const ADMIN_EMAIL = process.env.EMAIL_ADDRESS;

if (!PAYSTACK_SECRET_KEY || !ADMIN_EMAIL) {
  throw new Error("Required environment variables are not defined.");
}

export const requestWithdrawal = async (req: Request, res: Response) => {
  try {
    //@ts-ignore
    const userId = req.user.userId;
    const { amount, accountNumber, bankCode } = req.body;

    if (!amount || !accountNumber || !bankCode) {
      throw new BadRequestError("Amount, account number, and bank code are required");
    }

    // Verify the bank account details using Paystack
    const verifyResponse = await axios.get("https://api.paystack.co/bank/resolve", {
      params: {
        account_number: accountNumber,
        bank_code: bankCode,
      },
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      },
    });

    const accountDetails = verifyResponse.data.data;

    if (!accountDetails) {
      throw new BadRequestError("Invalid bank account details");
    }

    // If bank details are verified, proceed with the withdrawal process
    const withdrawal = await createWithdrawalRequest(userId, amount, {
      accountNumber,
      bankCode,
    });

    // Prepare email details
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

    // Send email notification to admin
    await sendEmail(emailOptions);

    res.status(StatusCodes.CREATED).json({
      message: "Withdrawal request created successfully",
      withdrawal,
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(StatusCodes.BAD_REQUEST).json({ error: error.message });
    } else {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal Server Error" });
    }
  }
};

// PATCH: Update withdrawal status (Admin only)
export const updateWithdrawalStatusController = async (req: Request, res: Response) => {
  try {
    //@ts-ignore
    const user = req.user;
    const { withdrawalId } = req.params;
    const { status } = req.body;

    // Only admin users can access this route
    if (!user.isAdmin) {
      throw new ForbiddenError('You are not authorized to perform this action');
    }

    // Validate the status input
    const validStatuses = ['pending', 'completed', 'failed'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestError('Invalid status. Status must be one of: pending, completed, failed');
    }

    // Find the withdrawal by its ID
    const withdrawal = await findWithdrawalById(withdrawalId);
    if (!withdrawal) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Withdrawal request not found',
      });
    }

    // Update the withdrawal status
    const updatedWithdrawal = await updateWithdrawalStatus(withdrawalId, status);

    return res.status(StatusCodes.OK).json({
      message: 'Withdrawal status updated successfully',
      updatedWithdrawal,
    });
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: error instanceof Error ? error.message : 'An error occurred',
    });
  }
};


// GET: List all withdrawal requests
export const listAllWithdrawals = async (req: Request, res: Response) => {
  try {
    const withdrawals = await getAllWithdrawals();
    res.status(StatusCodes.OK).json({
      message: "Withdrawals retrieved successfully",
      withdrawals,
    });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: error instanceof Error ? error.message : 'An error occurred',
    });
  }
};