// models/Transaction.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface ITransaction extends Document {
  userId: mongoose.Types.ObjectId;
  txType: 'deposit' | 'withdrawal' | 'internal_send' | 'internal_receive' | 'fee' | 'adjustment';
  paymentMethod: 'lightning' | 'onchain' | 'internal';
  amount: number;
  fee?: number;
  description?: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  relatedId?: mongoose.Types.ObjectId;
  relatedType?: 'invoice' | 'payment' | 'address';
  balance?: {
    before: number;
    after: number;
  };
  txHash?: string;
  confirmations?: number;
  blockHeight?: number;
  metadata?: {
    [key: string]: any;
  };
  createdAt: Date;
  completedAt?: Date;
  failedAt?: Date;
}

const TransactionSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    txType: {
      type: String,
      enum: ['deposit', 'withdrawal', 'internal_send', 'internal_receive', 'fee', 'adjustment'],
      required: true,
      index: true
    },
    paymentMethod: {
      type: String,
      enum: ['lightning', 'onchain', 'internal'],
      required: true,
      index: true
    },
    amount: {
      type: Number,
      required: true
    },
    fee: {
      type: Number,
      default: 0
    },
    description: {
      type: String
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'cancelled'],
      default: 'pending',
      index: true
    },
    relatedId: {
      type: Schema.Types.ObjectId,
      refPath: 'relatedType',
      index: true
    },
    relatedType: {
      type: String,
      enum: ['invoice', 'payment', 'address']
    },
    balance: {
      before: {
        type: Number
      },
      after: {
        type: Number
      }
    },
    txHash: {
      type: String,
      sparse: true,
      index: true
    },
    confirmations: {
      type: Number,
      default: 0
    },
    blockHeight: {
      type: Number
    },
    metadata: {
      type: Schema.Types.Mixed
    },
    completedAt: {
      type: Date
    },
    failedAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

// Add compound indexes for reporting and analytics
TransactionSchema.index({ userId: 1, createdAt: -1 });
TransactionSchema.index({ userId: 1, status: 1, txType: 1 });
TransactionSchema.index({ createdAt: -1, status: 1 });

export default mongoose.model<ITransaction>('Transaction', TransactionSchema);
