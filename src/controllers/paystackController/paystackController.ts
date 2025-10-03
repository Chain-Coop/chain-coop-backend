import { Request, Response } from 'express';
import { BadRequestError } from '../../errors/bad-request';
import { StatusCodes } from 'http-status-codes';
import asyncHandler from 'express-async-handler';
import {
  initializeCryptoPaymentService,
  transferToBankService,
} from '../../services/web3/payStack/paystackServices';
import { PaystackCashwyre } from '../../models/web3/paystackCashwyre';

export const initiateCryptoPayment = asyncHandler(
  async (req: Request, res: Response) => {
    const { amount, paymentMethod, crypto, network } = req.body;
    //@ts-ignore
    const email = req.user.email;

    if (!amount || !paymentMethod || !crypto || !network || !email) {
      throw new BadRequestError(
        'Amount, payment method, crypto, and network are required'
      );
    }

    try {
      const payment = await initializeCryptoPaymentService(
        amount,
        email,
        paymentMethod,
        crypto,
        network
      );

      res.status(StatusCodes.OK).json({
        success: true,
        message: 'Payment initiated successfully',
        data: payment,
      });
    } catch (error) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error,
      });
    }
  }
);

export const initiateNewTransfer = asyncHandler(
  async (req: Request, res: Response) => {
    const { amountInNaira, crypto, network } = req.body;
    //@ts-ignore
    const userId = req.user.userId;

    if (!amountInNaira || !crypto || !network || !userId) {
      throw new BadRequestError(
        'Amount in Naira, crypto, and network are required'
      );
    }
    try {
      const transfer = await transferToBankService(
        userId,
        amountInNaira,
        crypto,
        network
      );

      res.status(StatusCodes.OK).json({
        success: true,
        message: 'Transfer initiated successfully',
        data: transfer,
      });
    } catch (error) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error,
      });
    }
  }
);

export const transactionDetails = asyncHandler(
  async (req: Request, res: Response) => {
    //@ts-ignore
    const userId = req.user.userId;
    try {
      const transaction = await PaystackCashwyre.find({ userID: userId });
      if (!transaction) {
        res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: 'Transaction for this user not found',
        });
        return;
      }

      res.status(StatusCodes.OK).json({
        success: true,
        message: 'Transaction Found',
        transaction,
      });
    } catch (error) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error,
      });
    }
  }
);

export const transactionDetail = asyncHandler(
  async (req: Request, res: Response) => {
    //@ts-ignore
    const userId = req.user.userId;
    const transactionId = req.params.id;
    try {
      const transaction = await PaystackCashwyre.findOne({
        _id: transactionId,
        userID: userId,
      });
      if (!transaction) {
        res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: 'Transaction for this user not found',
        });
        return;
      }

      res.status(StatusCodes.OK).json({
        success: true,
        message: 'Transaction Found',
        transaction,
      });
    } catch (error) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error,
      });
    }
  }
);
