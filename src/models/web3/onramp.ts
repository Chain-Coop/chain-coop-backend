import mongoose, { Schema, Document } from 'mongoose';

// Enum for transaction status
export enum TransactionStatus {
  PENDING = 'pending',
  PAID = 'paid',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

// Enum for cryptocurrency types
export enum CryptoType {
  USDT = 'usdt',
  USDC = 'usdc',
}
export enum CryptoNetwork {
  BSC = 'bsc',
  POLYGON = 'polygon',
}

// Interface for the Onramp document
export interface IOnramp extends Document {
  userId: mongoose.Types.ObjectId;
  amountInNaira: number;
  amountInCrypto: number;
  cryptoType: CryptoType;
  cryptoNetwork: CryptoNetwork;
  transactionStatus: TransactionStatus;
  exchangeRate: number;
  transactionId: string;
  walletAddress: string;
  transactionHash?: string;
  fee?: number;
  failureReason?: string;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Mongoose Schema
const OnrampSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    amountInNaira: {
      type: Number,
      required: [true, 'Amount in Naira is required'],
      min: [1000, 'Minimum amount is ₦1000'],
      max: [10000000, 'Maximum amount is ₦10,000,000'],
      validate: {
        validator: function (v: number) {
          return v > 0;
        },
        message: 'Amount must be greater than 0',
      },
    },
    amountInCrypto: {
      type: Number,
      required: [true, 'Amount in crypto is required'],
      min: [0, 'Crypto amount cannot be negative'],
    },
    cryptoType: {
      type: String,
      enum: Object.values(CryptoType),
      required: [true, 'Cryptocurrency type is required'],
      default: CryptoType.USDT,
    },
    cryptoNetwork: {
      type: String,
      enum: Object.values(CryptoNetwork),
      required: [true, 'Cryptocurrency network is required'],
      default: CryptoNetwork.BSC,
    },
    transactionStatus: {
      type: String,
      enum: Object.values(TransactionStatus),
      default: TransactionStatus.PENDING,
      required: true,
      index: true,
    },
    exchangeRate: {
      type: Number,
      required: [true, 'Exchange rate is required'],
      min: [0, 'Exchange rate must be positive'],
    },
    transactionId: {
      type: String,
      required: [true, 'Transaction ID is required'],
      unique: true,
      index: true,
    },
    walletAddress: {
      type: String,
      required: [true, 'Wallet address is required'],
      trim: true,
      validate: {
        validator: function (v: string) {
          // Validate EVM addresses only (BSC and Polygon)
          return /^0x[0-9a-fA-F]{40}$/.test(v);
        },
        message: 'Invalid EVM wallet address format',
      },
    },
    transactionHash: {
      type: String,
      trim: true,
      index: true,
    },
    fee: {
      type: Number,
      default: 0,
      min: [0, 'Fee cannot be negative'],
    },
    failureReason: {
      type: String,
      trim: true,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

OnrampSchema.index({ userId: 1, createdAt: -1 });

// Pre-save middleware to calculate net amount
OnrampSchema.pre('save', function (next) {
  // Set completedAt when status changes to completed
  if (
    this.isModified('transactionStatus') &&
    this.transactionStatus === TransactionStatus.COMPLETED &&
    !this.completedAt
  ) {
    this.completedAt = new Date();
  }

  next();
});

// Static method to get user's total onramp amount
OnrampSchema.statics.getUserTotalOnramp = async function (
  userId: mongoose.Types.ObjectId
): Promise<number> {
  const result = await this.aggregate([
    {
      $match: {
        userId: userId,
        transactionStatus: TransactionStatus.COMPLETED,
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$amountInNaira' },
      },
    },
  ]);

  return result.length > 0 ? result[0].total : 0;
};

// Export the model
export const Onramp = mongoose.model<IOnramp>('Onramp', OnrampSchema);
