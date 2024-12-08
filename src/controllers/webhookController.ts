import { Request, Response } from "express";
import {
  verifyContributionPayment,
  verifyUnpaidContributionPayment,
} from "../services/contributionService";

import { verifyPayment } from "../services/paystackService";
import { BVNWebhook } from "../services/kycservice";

export const webhookController = async (req: Request, res: Response) => {
  console.log("Webhook called");
  res.sendStatus(200);

  const data = req.body;
  if (data.event === "charge.success") {
    if (
      data.data.status === "success" &&
      data.data.metadata.type === "conpayment"
    ) {
      verifyContributionPayment(data.data.reference);
    } else if (
      data.data.status === "success" &&
      data.data.metadata.type === "conunpaid"
    ) {
      verifyUnpaidContributionPayment(data.data.reference);
    } else if (
      data.data.status === "success" &&
      data.data.metadata.type === "wallet_funding"
    ) {
      verifyPayment(data.data.reference);
    }
  }

  if (data.event === "customeridentification.success") {
    BVNWebhook(data.data);
  }
};
