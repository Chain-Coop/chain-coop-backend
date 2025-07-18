import mongoose, { Schema, Document, Model } from 'mongoose';

// Define transaction types
export enum CashwyreTransactionType {
  ONRAMP = 'ONRAMP', // Buying crypto with fiat (NGN)
  OFFRAMP = 'OFFRAMP', // Selling crypto for fiat (NGN)
}

// Define transaction status
export enum CashwyreTransactionStatus {
  NEW = 'NEW',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

// Define the document interface
export interface ICashwyreTransaction extends Document {
  userId: mongoose.Types.ObjectId;
  transactionType: CashwyreTransactionType;
  status: CashwyreTransactionStatus;
  reference: string;
  transactionReference: string;
  amount: number;
  cryptoAmount: number;
  cryptoAsset: string;
  cryptoAssetNetwork: string;
  cryptoRate: number;
  txHash?: string; // Blockchain transaction hash (for OFFRAMP)

  // Bank details (for OFFRAMP)
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  bankCode?: string;

  // Crypto address (for ONRAMP)
  userAddress?: string;

  offrampAddress?: string;
  tokenAddress?: string;
  chainCoopFees?: number; // Fees charged by Chain Coop (for ONRAMP)

  offrampTokensTransferred?: boolean; // Amount of tokens transferred to the user (for OFFRAMP)

  // Timestamps automatically handled by mongoose
  createdAt: Date;
  updatedAt: Date;
}

// Define the schema
const CashwyreTransactionSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    transactionType: {
      type: String,
      enum: Object.values(CashwyreTransactionType),
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(CashwyreTransactionStatus),
      default: CashwyreTransactionStatus.NEW,
    },
    reference: {
      type: String,
      required: true,
      unique: true,
    },
    transactionReference: {
      type: String,
      required: true,
      unique: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    cryptoAmount: {
      type: Number,
      required: true,
    },
    cryptoAsset: {
      type: String,
      required: true,
    },
    cryptoAssetNetwork: {
      type: String,
      required: true,
    },
    cryptoRate: {
      type: Number,
      required: true,
    },
    txHash: {
      type: String,
    },
    bankName: {
      type: String,
    },
    accountName: {
      type: String,
    },
    accountNumber: {
      type: String,
    },
    bankCode: {
      type: String,
    },
    userAddress: {
      type: String,
    },
    offrampAddress: {
      type: String,
    },
    tokenAddress: {
      type: String,
    },
    chainCoopFees: {
      type: Number,
      default: 0, // Default to 0 if not specified
    },
    offrampTokensTransferred: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes
CashwyreTransactionSchema.index({ userId: 1, createdAt: -1 });
CashwyreTransactionSchema.index({ reference: 1 }, { unique: true });
CashwyreTransactionSchema.index({ transactionReference: 1 }, { unique: true });
CashwyreTransactionSchema.index({ status: 1 });

// Define static methods
interface CashwyreTransactionModel extends Model<ICashwyreTransaction> {
  findByReference(reference: string): Promise<ICashwyreTransaction | null>;
  findByTransactionReference(
    transactionReference: string
  ): Promise<ICashwyreTransaction | null>;
  findByUserId(
    userId: mongoose.Types.ObjectId
  ): Promise<ICashwyreTransaction[]>;
  updateTransactionStatus(
    reference: string,
    status: CashwyreTransactionStatus
  ): Promise<ICashwyreTransaction | null>;
}

CashwyreTransactionSchema.statics.findByReference = function (
  reference: string
): Promise<ICashwyreTransaction | null> {
  return this.findOne({ reference });
};

CashwyreTransactionSchema.statics.findByTransactionReference = function (
  transactionReference: string
): Promise<ICashwyreTransaction | null> {
  return this.findOne({ transactionReference });
};

CashwyreTransactionSchema.statics.findByUserId = function (
  userId: mongoose.Types.ObjectId
): Promise<ICashwyreTransaction[]> {
  return this.find({ userId }).sort({ createdAt: -1 });
};

CashwyreTransactionSchema.statics.updateTransactionStatus = function (
  reference: string,
  status: CashwyreTransactionStatus
): Promise<ICashwyreTransaction | null> {
  return this.findOneAndUpdate({ reference }, { status }, { new: true });
};

// Create the model
const CashwyreTransaction = mongoose.model<
  ICashwyreTransaction,
  CashwyreTransactionModel
>('CashwyreTransaction', CashwyreTransactionSchema);

export default CashwyreTransaction;
