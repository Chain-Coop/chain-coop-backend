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
  res.sendStatus(200);

  const data = req.body;

  if (data.eventType === 'btc.lightning.received.success') {
    CashwyreServices.updateLightningBalance(
      data.eventData.address,
      data.eventData.amount
    );
    const details: ILightningAddress | null = await LightningAddress.findOne({
      address: data.eventData.address,
    });

    if (details) {
      incrementBalance(details.userId, data.eventData.amount);
    }
  } else if (data.eventType === 'crypto.onramp.success') {
    await CashwyreTransaction.updateOne(
      { reference: data.eventData.RequestId },
      {
        $set: {
          status: CashwyreTransactionStatus.SUCCESS,
        },
      }
    );
  } else if (data.eventType === 'crypto.offramp.success') {
    await CashwyreTransaction.updateOne(
      { reference: data.eventData.RequestId },
      {
        $set: {
          status: CashwyreTransactionStatus.SUCCESS,
        },
      }
    );
  } else if (data.eventType === 'cryoto.onramp.failed') {
    await CashwyreTransaction.updateOne(
      { reference: data.eventData.RequestId },
      {
        $set: {
          status: CashwyreTransactionStatus.FAILED,
        },
      }
    );
  } else if (data.eventType === 'crypto.offramp.failed') {
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
};
