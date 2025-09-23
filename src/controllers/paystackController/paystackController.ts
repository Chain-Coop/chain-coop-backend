import { Request, Response } from 'express';
import { BadRequestError } from '../../errors/bad-request';
import { StatusCodes } from 'http-status-codes';
import { initializeCryptoPaymentService } from '../../services/web3/payStack/paystackServices';

const secret = process.env.PAYSTACK_SECRET_KEY!;
interface UserData {
  email: string;
  _id: string;
}

export const initiateCryptoPayment = async (req: Request, res: Response) => {
  const { amount, paymentMethod, crypto, network } = req.body;
  //@ts-ignore
  const email = req.user.email;

  if (!amount || !email) {
    throw new BadRequestError('Amount and email are required');
  }
  try {
    const payment = await initializeCryptoPaymentService(
      amount,
      email,
      paymentMethod,
      crypto,
      network
    );
    return res
      .status(StatusCodes.OK)
      .json({ message: 'Payment initiated', payment });
  } catch (error) {
    console.error('Error initiating crypto payment:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: `Failed to initiate payment: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
    });
  }
};
