// models/Invoice.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IInvoice {
  userId: mongoose.Types.ObjectId;
  invoiceId: string; // LND invoice ID
  bolt11: string; // BOLT11 invoice string
  preimage?: string;
  payment_request: string,
  amount: number; // In satoshis
  amountPaid?: number; // Actual amount paid (in case of overpayment)
  memo: string;
  status: 'pending' | 'paid' | 'expired' | 'cancelled';
  expiresAt: Date;
  paidAt?: Date;
  settlementFee?: number;
  metadata?: {
    [key: string]: any;
  };
  paymentHash: string;
}

const InvoiceSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    invoiceId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    bolt11: {
      type: String,
      required: true,
    },
    preimage: {
      type: String,
    },
    payment_request: {
      type: String,
      required: true,
      unique: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    amountPaid: {
      type: Number,
    },
    memo: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'expired', 'cancelled'],
      default: 'pending',
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    paidAt: {
      type: Date,
    },
    settlementFee: {
      type: Number,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
    paymentHash: {
      type: String,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IInvoice>('Invoice', InvoiceSchema);
