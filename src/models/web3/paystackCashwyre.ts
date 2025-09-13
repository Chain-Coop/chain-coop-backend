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
  reference: string;
  cashwyreReference: string;
  userEmail: string;
  userID: string;
  recipientCode: string;
  bankAccNum: string;
  cashwyreStatus: string;
  userWallet: string;
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
    reference: {
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
    bankAccNum: {
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
