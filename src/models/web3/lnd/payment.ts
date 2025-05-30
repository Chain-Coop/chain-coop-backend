// models/Payment.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IPaymentData {
  userId: mongoose.Types.ObjectId;
  paymentId: string; // LND payment ID
  bolt11?: string; // Original BOLT11 invoice if available
  amount: number; // In satoshis
  fee: number; // In satoshis
  payment_index: number;
  destination: string,
  status: 'in_flight' | 'succeeded' | 'failed' | 'initiated';
  preimage?: string;
  failureReason?: string;
  hops?: number;
  metadata?: {
    [key: string]: any;
  };
  paymentHash: string;
  succeededAt?: Date;
  failedAt?: Date;
  isRecoverable?: boolean;
  routingHints?: any[];
  retryCount?: number;
}

// Full interface that extends Document (for database operations)
export interface IPayment extends IPaymentData, Document { }

const PaymentSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    paymentId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    bolt11: {
      type: String
    },
    amount: {
      type: Number,
      required: true
    },
    fee: {
      type: Number,
      default: 0
    },
    destination: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['in_flight', 'succeeded', 'failed', 'initiated'],
      default: 'initiated',
      index: true
    },
    preimage: {
      type: String
    },
    failureReason: {
      type: String
    },
    hops: {
      type: Number
    },
    metadata: {
      type: Schema.Types.Mixed
    },
    paymentHash: {
      type: String,
      required: true,
      index: true
    },
    succeededAt: {
      type: Date
    },
    failedAt: {
      type: Date
    },
    isRecoverable: {
      type: Boolean,
      default: false
    },
    routingHints: {
      type: Array
    },
    retryCount: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model<IPayment>('Payment', PaymentSchema);
