import { Request, Response } from 'express';
import axios from 'axios';
import { StatusCodes } from 'http-status-codes';

// Paystack secret key from environment variables
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_KEY;

// Function to get all banks
export const getAllBanks = async (req: Request, res: Response) => {
  try {
    const response = await axios.get('https://api.paystack.co/bank', {
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      },
    });

    const banks = response.data.data;

    res.status(StatusCodes.OK).json({
      message: 'Banks retrieved successfully',
      banks,
    });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Failed to retrieve banks',
      //@ts-ignore
      error: error.message,
    });
  }
};

// POST endpoint to verify bank account
export const verifyBankAccount = async (req: Request, res: Response) => {
    const { accountNumber, bankCode } = req.body;
  
    if (!accountNumber || !bankCode) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Account number and bank code are required',
      });
    }
  
    try {
      const response = await axios.get(`https://api.paystack.co/bank/resolve`, {
        params: {
          account_number: accountNumber,
          bank_code: bankCode,
        },
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      });
  
      const accountDetails = response.data.data;
  
      if (!accountDetails) {
        return res.status(StatusCodes.NOT_FOUND).json({
          message: 'Invalid bank details',
        });
      }
  
      res.status(StatusCodes.OK).json({
        message: 'Bank account verified successfully',
        accountDetails,
      });
    } catch (error) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: 'Failed to verify bank account',
        //@ts-ignore
        error: error.message,
      });
    }
  };
  