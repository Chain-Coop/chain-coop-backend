import { Request, Response } from 'express';
import { BadRequestError } from '../../errors/bad-request';
import { StatusCodes } from 'http-status-codes';
import asyncHandler from 'express-async-handler';
import {
  initializeCryptoPaymentService,
  transferToBankService,
} from '../../services/web3/payStack/paystackServices';

export const initiateCryptoPayment = asyncHandler(
  async (req: Request, res: Response) => {
    const { amount, paymentMethod, crypto, network } = req.body;
    //@ts-ignore
    const email = req.user.email;

    if (!amount || !paymentMethod || !crypto || !network) {
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
    const userId = req.user._id;

    if (!amountInNaira || !crypto || !network) {
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
