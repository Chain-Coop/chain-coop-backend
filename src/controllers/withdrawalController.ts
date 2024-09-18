import { Request, Response } from "express";
import { createWithdrawalRequest, updateWithdrawalStatus, findWithdrawalById } from "../services/withdrawalService"; // Make sure these are imported
import { BadRequestError, ForbiddenError } from "../errors";
import { StatusCodes } from "http-status-codes";
import axios from "axios";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_KEY;

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
