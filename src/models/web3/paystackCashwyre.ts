import mongoose, { Document, Schema } from 'mongoose';
import { CashwyreTransactionStatus } from './cashWyreTransactions';

// Define the TransferStatus enum
export enum TransferStatus {
  SUCCESS = 'success',
  PENDING = 'pending',
  FAILED = 'failed',
  REVERSED = 'reversed',
}
export enum TransactionStatus {
  NEW = 'new',
  DEBITED = 'debited',
  TRANSFERRED = 'transferred',
  CREDITED = 'credited',
  FAILED = 'failed',
}

// Define the interface for the document
export interface IPaystackCashwyre extends Document {
  amountInNaira: number;
  amountInCrypto: number;
  transferStatus: TransferStatus;
  transactionStatus: TransactionStatus;
  paystackReference: string;
  cashwyreReference?: string;
  chainCoopReference: string;
  userEmail: string;
  userID: string;
  recipientCode?: string;
  cashwyreAcc?: string;
  cashwyreStatus: string;
  userWallet: string;
  crypto?: string;
  network?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Create the schema
const paystackCashwyreSchema = new Schema<IPaystackCashwyre>(
  {
    amountInNaira: {
      type: Number,
      required: true,
      min: 0,
    },
    amountInCrypto: {
      type: Number,
      min: 0,
    },
    transferStatus: {
      type: String,
      enum: Object.values(TransferStatus),
      default: TransferStatus.PENDING,
    },
    paystackReference: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    cashwyreReference: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    chainCoopReference: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    transactionStatus: {
      type: String,
      enum: Object.values(TransactionStatus),
      default: TransactionStatus.NEW,
    },
    userEmail: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please enter a valid email',
      ],
    },
    userID: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    recipientCode: {
      type: String,
      trim: true,
    },
    cashwyreAcc: {
      type: String,
      trim: true,
    },
    cashwyreStatus: {
      type: String,
      enum: Object.values(CashwyreTransactionStatus),
      default: CashwyreTransactionStatus.NEW,
    },
    userWallet: {
      type: String,
      trim: true,
    },
    crypto: {
      type: String,
      trim: true,
    },
    network: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
    versionKey: false, // Removes the __v field
  }
);

// Add indexes for better query performance
paystackCashwyreSchema.index({ reference: 1 });
paystackCashwyreSchema.index({ userEmail: 1 });
paystackCashwyreSchema.index({ userID: 1 });
paystackCashwyreSchema.index({ transferStatus: 1 });

// Create and export the model
export const PaystackCashwyre = mongoose.model<IPaystackCashwyre>(
  'PaystackCashwyre',
  paystackCashwyreSchema
);
