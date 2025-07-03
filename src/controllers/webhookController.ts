import { Request, Response } from 'express';
import {
  verifyContributionPayment,
  verifyUnpaidContributionPayment,
} from '../services/contributionService';

import { verifyPayment } from '../services/paystackService';
import { BVNWebhook } from '../services/kycservice';
import { sendEmail } from '../utils/sendEmail';
import { verifyPaymentService } from '../services/walletService';
import CashwyreServices from '../services/web3/Cashwyre/cashWyre';
import { incrementBalance } from '../services/web3/lndService/lndService';
import { ILightningAddress, LightningAddress } from '../models/web3/cashwyre';
import CashwyreTransaction, {
  CashwyreTransactionStatus,
  CashwyreTransactionType,
} from '../models/web3/cashWyreTransactions';

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
    }
  }

  if (data.event === 'customeridentification.success') {
    BVNWebhook(data.data);
  }

  if (data.event === 'customeridentification.failed') {
    sendEmail({
      to: data.data.email,
      subject: 'BVN Verification Failed',
      text: `Your BVN verification failed. Please try again`,
    });
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
      // Fixed typo: 'cryoto' -> 'crypto'
      console.log('Processing onramp failed');
      await CashwyreTransaction.updateOne(
        { reference: data.eventData.RequestId },
        {
          $set: {
            status: CashwyreTransactionStatus.FAILED,
          },
        }
      );
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
