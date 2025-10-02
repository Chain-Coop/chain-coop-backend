import { Request, Response } from 'express';
import {
  verifyContributionPayment,
  verifyUnpaidContributionPayment,
} from '../services/contributionService';

import {
  handleCashwyreWebhook,
  verifyCryptoPaymentService,
  verifyTransferService,
} from '../services/web3/payStack/paystackServices';
import { sendEmail } from '../utils/sendEmail';
import { verifyPaymentService } from '../services/walletService';
import CashwyreServices from '../services/web3/Cashwyre/cashWyre';
import { incrementBalance } from '../services/web3/lndService/lndService';
import { ILightningAddress, LightningAddress } from '../models/web3/cashwyre';
import CashwyreTransaction, {
  CashwyreTransactionStatus,
  CashwyreTransactionType,
} from '../models/web3/cashWyreTransactions';
import VantServices from '../services/vantWalletServices';
import { StatusCodes } from 'http-status-codes';
import { PaystackCashwyre } from '../models/web3/paystackCashwyre';

export const webhookController = async (req: Request, res: Response) => {
  console.log('Webhook called');
  res.sendStatus(200);

  const data = req.body;
  if (data.event === 'charge.success') {
    if (
      data.data.status === 'success' &&
      data.data.metadata.type === 'conpayment'
    ) {
      verifyContributionPayment(data.data.reference);
    } else if (
      data.data.status === 'success' &&
      data.data.metadata.type === 'conunpaid'
    ) {
      verifyUnpaidContributionPayment(data.data.reference);
    } else if (
      data.data.status === 'success' &&
      data.data.metadata.type === 'wallet_funding'
    ) {
      verifyPaymentService(data.data.reference);
    } else if (
      data.data.status === 'success' &&
      data.data.metadata.type === 'crypto_wallet_funding'
    ) {
      await verifyCryptoPaymentService(data.data.reference);
    }
  }


  if (data.event === 'transfer.success') {
    console.log('Transfer success webhook received');
    const status = data.data.status;
    const reference = data.data.reference;
    verifyTransferService(reference, status);
  }
  if (data.event === 'transfer.failed') {
    console.log('Transfer failed webhook received');
    const status = data.data.status;
    const reference = data.data.reference;
    verifyTransferService(reference, status);
  }
  if (data.event === 'transfer.reversed') {
    console.log('Transfer reversed webhook received');
    const status = data.data.status;
    const reference = data.data.reference;
    verifyTransferService(reference, status);
  }
};
export const CashwyreWebhookController = async (
  req: Request,
  res: Response
) => {
  console.log('Cashwyre Webhook called');

  const data = req.body;
  console.log('Cashwyre Webhook Data:', JSON.stringify(data, null, 2));

  try {
    if (data.eventType === 'btc.lightning.received.success') {
      console.log('Processing lightning payment received');
      console.log('Address:', data.eventData.address);
      console.log('Amount:', data.eventData.amount);

      // Update lightning balance in Cashwyre service
      await CashwyreServices.updateLightningBalance(
        data.eventData.address,
        data.eventData.amount
      );

      // Find lightning address details
      const details: ILightningAddress | null = await LightningAddress.findOne({
        address: data.eventData.address,
      });

      console.log('Lightning address details found:', details);

      if (details) {
        console.log('Incrementing balance for user:', details.userId);
        await incrementBalance(details.userId, data.eventData.amount);
        console.log('Balance incremented successfully');
      } else {
        console.log('No lightning address found for:', data.eventData.address);
      }
    } else if (data.eventType === 'crypto.onramp.success') {
      console.log('Processing onramp success');
      await CashwyreTransaction.updateOne(
        { reference: data.eventData.RequestId },
        {
          $set: {
            status: CashwyreTransactionStatus.SUCCESS,
          },
        }
      );
      const autoTransaction = await PaystackCashwyre.findOne({
        chainCoopReference: data.eventData.RequestId,
        transactionStatus: 'sufficient',
      });
      if (autoTransaction) {
        handleCashwyreWebhook(
          data.eventData.RequestId,
          CashwyreTransactionStatus.SUCCESS
        );
      }
    } else if (data.eventType === 'crypto.offramp.success') {
      console.log('Processing offramp success');
      await CashwyreTransaction.updateOne(
        { reference: data.eventData.RequestId },
        {
          $set: {
            status: CashwyreTransactionStatus.SUCCESS,
          },
        }
      );
    } else if (data.eventType === 'crypto.onramp.failed') {
      console.log('Processing onramp failed');
      await CashwyreTransaction.updateOne(
        { reference: data.eventData.RequestId },
        {
          $set: {
            status: CashwyreTransactionStatus.FAILED,
          },
        }
      );
      const autoTransaction = await PaystackCashwyre.findOne({
        chainCoopReference: data.eventData.RequestId,
        transactionStatus: 'sufficient',
      });
      if (autoTransaction) {
        handleCashwyreWebhook(
          data.eventData.RequestId,
          CashwyreTransactionStatus.FAILED
        );
      }
    } else if (data.eventType === 'crypto.offramp.failed') {
      console.log('Processing offramp failed');
      await CashwyreTransaction.updateOne(
        { reference: data.eventData.RequestId },
        {
          $set: {
            status: CashwyreTransactionStatus.FAILED,
          },
        }
      );
    } else {
      console.log('Unhandled Cashwyre event type:', data.eventType);
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Error processing Cashwyre webhook:', error);
    res.sendStatus(500);
  }
};

export const VantWebhookController = async (req: Request, res: Response) => {
  console.log('Vant Webhook called');

  const data = req.body;
  console.log('Vant Webhook Data:', JSON.stringify(data, null, 2));

  res.status(StatusCodes.OK);

  try {
    if (data.event === 'account_creation') {
      const webhookData = {
        data: data.data,
        statusCode: data.statusCode,
        error: data.error,
      };

      // Update the reserved wallet based on webhook data
      await VantServices.updateReservedWalletFromWebhook(webhookData);
      console.log('Reserved wallet webhook processed successfully');
    } else if (data.event === 'transfer') {
      const transferData = {
        reference: data.reference,
        amount: parseFloat(data.amount),
        account_number: data.account_number,
        originator_account_number: data.originator_account_number,
        originator_account_name: data.originator_account_name,
        originator_bank: data.originator_bank,
        originator_narration: data.originator_narration,
        status: data.status,
        meta: data.meta,
        timestamp: data.timestamp,
        sessionId: data.sessionId,
      };

      // Process the inward transfer
      await VantServices.processInwardTransfer(transferData);
      console.log('Inward transfer webhook processed successfully');
    }
  } catch (error) {
    console.error('Error processing Vant webhook:', error);
    res.sendStatus(500);
  }
};