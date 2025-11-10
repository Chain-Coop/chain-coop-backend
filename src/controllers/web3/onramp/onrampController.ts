import { Request, Response } from 'express';
import AsyncHandler from 'express-async-handler';
import {
  createOnrampTransaction,
  transferToCryptoWallet,
  getUserOnrampTransactions,
  getOnrampTransactionById,
  refundWalletOnramp,
} from '../../../services/web3/onramp/onrampServices';

export const initiateOnramp = AsyncHandler(
  async (req: Request, res: Response) => {
    const { amountInNaira, cryptoCurrency, cryptoNetwork } = req.body;
    if (!amountInNaira || !cryptoCurrency || !cryptoNetwork) {
      res.status(400);
      throw new Error('Missing required fields');
    }
    const userId = req.user?.userId;
    if (!userId) {
      res.status(400);
      throw new Error('User ID is required');
    }
    try {
      const onrampTransaction = await createOnrampTransaction(
        userId,
        amountInNaira,
        cryptoCurrency,
        cryptoNetwork
      );

      res.status(201).json(onrampTransaction);
      return;
    } catch (error) {
      console.error('Error initiating onramp transaction:', error);
      res.status(500);
      return;
    }
  }
);

export const processOnrampPayment = AsyncHandler(
  async (req: Request, res: Response) => {
    const { onrampTransactionId } = req.params;
    try {
      const onrampTransaction = await transferToCryptoWallet(
        onrampTransactionId
      );
      res.status(200).json(onrampTransaction);
      return;
    } catch (error) {
      console.error('Error processing onramp payment:', error);
      res.status(500);
      return;
    }
  }
);

export const refundOnrampTransaction = AsyncHandler(
  async (req: Request, res: Response) => {
    const { onrampTransactionId } = req.params;
    try {
      const refundedTransaction = await refundWalletOnramp(onrampTransactionId);
      res.status(200).json(refundedTransaction);
      return;
    } catch (error) {
      console.error('Error refunding onramp transaction:', error);
      res.status(500);
      return;
    }
  }
);

export const getUserOnrampTxns = AsyncHandler(
  async (req: Request, res: Response) => {
    //@ts-ignore
    const userId = req.user.userId;
    if (!userId) {
      res.status(400);
      throw new Error('User ID is required');
    }
    try {
      const transactions = await getUserOnrampTransactions(userId);
      res.status(200).json(transactions);
      return;
    } catch (error) {
      console.error('Error fetching user onramp transactions:', error);
      res.status(500);
      return;
    }
  }
);

export const getOnrampTxnById = AsyncHandler(
  async (req: Request, res: Response) => {
    const { onrampTransactionId } = req.params;
    try {
      const transaction = await getOnrampTransactionById(onrampTransactionId);
      if (!transaction) {
        res.status(404);
        throw new Error('Onramp transaction not found');
      }
      res.status(200).json(transaction);
      return;
    } catch (error) {
      console.error('Error fetching onramp transaction by ID:', error);
      res.status(500);
      return;
    }
  }
);
