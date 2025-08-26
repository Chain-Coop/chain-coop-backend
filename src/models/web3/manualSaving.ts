// models/ManualSaving.ts
import mongoose, { Document, Model, Schema } from 'mongoose';

export enum TransactionStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED',
}
export enum DepositType {
  SAVE = 'SAVE',
  UPDATE = 'UPDATE',
  WITHDRAW = 'WITHDRAW',
}

export interface Transaction {
  txHash: string;
  amount: string;
  yieldEarned?: string;
  timestamp: Date;
  status: TransactionStatus;
  depositType: DepositType;
  poolAmount: string;
  error?: string;
}
export enum network {
  BSC = 'BSC',
  ETHERLINK = 'ETHERLINK',
  LISK = 'LISK',
  POLYGON = 'POLYGON',
}

export interface IManualSaving extends Document {
  userId: mongoose.Types.ObjectId;
  poolId: string;
  tokenAddress: string;
  tokenSymbol?: string;
  initialAmount: string;
  reason: string;
  lockType: number;
  duration: number;
  isActive: boolean;
  encryptedPrivateKey: string;
  transactions: Transaction[];
  totalAmount: string;
  network: network;
  createdAt: Date;
  updatedAt: Date;

  addTransaction(
    txHash: string,
    amount: string,
    status: TransactionStatus,
    depositType: DepositType,
    poolAmount: string,
    error?: string | null
  ): Promise<IManualSaving>;
  updateTotalAmount(): void;
}

interface IManualSavingModel extends Model<IManualSaving> {
  findByPoolId(poolId: string): Promise<IManualSaving | null>;
  findActiveByUser(userId: string): Promise<IManualSaving[]>;
}

const transactionSchema = new Schema<Transaction>(
  {
    txHash: { type: String, required: true },
    amount: { type: String, required: true },
    yieldEarned: { type: String },
    timestamp: { type: Date, required: true },
    status: {
      type: String,
      enum: Object.values(TransactionStatus),
      default: TransactionStatus.PENDING,
      required: true,
    },
    depositType: {
      type: String,
      enum: Object.values(DepositType),
      default: DepositType.SAVE,
      required: true,
    },
    poolAmount: {
      type: String,
      required: true,
    },
    error: { type: String },
  },
  { _id: false }
);

const manualSavingSchema = new Schema<IManualSaving>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    poolId: { type: String, required: true, unique: true },
    tokenAddress: { type: String, required: true },
    tokenSymbol: { type: String },
    initialAmount: { type: String, required: true },
    reason: { type: String, required: true },
    lockType: { type: Number, required: true, min: 0, max: 2 },
    duration: { type: Number, required: true },
    isActive: { type: Boolean, default: true },
    encryptedPrivateKey: { type: String, required: true },
    transactions: [transactionSchema],
    totalAmount: { type: String, default: '0' },
    network: {
      type: String,
      enum: Object.values(network),
      required: true,
    },
  },
  { timestamps: true }
);

manualSavingSchema.index({ userId: 1, isActive: 1 });

// Method to recalculate and update total amount
manualSavingSchema.methods.updateTotalAmount = function () {
  let total = 0;

  // Add all confirmed transaction amounts
  this.transactions.forEach(
    (tx: { status: TransactionStatus; amount: string }) => {
      if (tx.status === TransactionStatus.CONFIRMED) {
        total += parseFloat(tx.amount) || 0;
      }
    }
  );

  // Update the totalAmount field
  this.totalAmount = total.toString();
};

manualSavingSchema.methods.addTransaction = async function (
  txHash: string,
  amount: string,
  status: TransactionStatus = TransactionStatus.PENDING,
  depositType: DepositType,
  poolAmount: string,
  error: string | null = null
) {
  this.transactions.push({
    txHash,
    amount,
    timestamp: new Date(),
    status,
    depositType,
    poolAmount,
    error: error ?? undefined,
  });

  // If the transaction is confirmed, update total amount
  if (status === TransactionStatus.CONFIRMED) {
    this.updateTotalAmount();
  }

  return this.save();
};

manualSavingSchema.statics.findByPoolId = function (poolId: string) {
  return this.findOne({ poolId });
};

manualSavingSchema.statics.findActiveByUser = function (userId: string) {
  return this.find({ userId, isActive: true });
};

export const ManualSaving = mongoose.model<IManualSaving, IManualSavingModel>(
  'ManualSaving',
  manualSavingSchema
);
