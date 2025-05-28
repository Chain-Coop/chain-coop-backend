// models/PeriodicSaving.ts
import mongoose, { Document, Model, Schema } from 'mongoose';

export enum SavingInterval {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
}
export enum DepositType {
  SAVE = 'SAVE',
  UPDATE = 'UPDATE',
  WITHDRAW = 'WITHDRAW',
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED',
}
export enum network {
  BSC = 'BSC',
  ETHERLINK = 'ETHERLINK',
  LISK = 'LISK',
  POLYGON = 'POLYGON',
}
export interface Transaction {
  txHash: string;
  amount: string;
  timestamp: Date;
  status: TransactionStatus;
  depositType: DepositType;
  poolAmount: string;
  error?: string;
}

export interface IPeriodicSaving extends Document {
  userId: mongoose.Types.ObjectId;
  poolId: string;
  tokenAddress: string;
  tokenSymbol?: string;
  initialAmount: string;
  periodicAmount: string;
  reason: string;
  lockType: number;
  duration: number;
  interval: SavingInterval;
  isActive: boolean;
  lastExecutionTime: Date;
  nextExecutionTime?: Date;
  encryptedPrivateKey: string;
  transactions: Transaction[];
  totalAmount: string;
  network: network;
  createdAt: Date;
  updatedAt: Date;

  updateLastExecution(): Promise<IPeriodicSaving>;
  updateTotalAmount(): void;
  addTransaction(
    txHash: string,
    amount: string,
    status: TransactionStatus,
    depositType: DepositType,
    poolAmount: string,
    error?: string | null
  ): Promise<IPeriodicSaving>;
}

interface IPeriodicSavingModel extends Model<IPeriodicSaving> {
  findDueExecutions(): Promise<IPeriodicSaving[]>;
  findByPoolId(poolId: string): Promise<IPeriodicSaving | null>;
  findActiveByUser(userId: string): Promise<IPeriodicSaving[]>;
}

const transactionSchema = new Schema<Transaction>(
  {
    txHash: { type: String, required: true },
    amount: { type: String, required: true },
    timestamp: { type: Date, required: true },
    status: {
      type: String,
      enum: Object.values(TransactionStatus),
      default: TransactionStatus.PENDING,
    },
    depositType: {
      type: String,
      enum: Object.values(DepositType),
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

const periodicSavingSchema = new Schema<IPeriodicSaving>(
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
    periodicAmount: { type: String, required: true },
    reason: { type: String, required: true },
    lockType: { type: Number, required: true, min: 0, max: 2 },
    duration: { type: Number, required: true },
    interval: {
      type: String,
      enum: Object.values(SavingInterval),
      required: true,
    },
    isActive: { type: Boolean, default: true },
    lastExecutionTime: { type: Date, default: Date.now },
    nextExecutionTime: { type: Date },
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

periodicSavingSchema.index({ userId: 1, isActive: 1 });
periodicSavingSchema.index({ nextExecutionTime: 1, isActive: 1 });

function calculateNextExecutionTime(
  lastExecution: Date,
  interval: SavingInterval
): Date {
  const next = new Date(lastExecution);
  switch (interval) {
    case SavingInterval.DAILY:
      next.setDate(next.getDate() + 1);
      break;
    case SavingInterval.WEEKLY:
      next.setDate(next.getDate() + 7);
      break;
    case SavingInterval.MONTHLY:
      next.setMonth(next.getMonth() + 1);
      break;
    default:
      throw new Error(`Invalid interval: ${interval}`);
  }
  return next;
}

periodicSavingSchema.methods.updateTotalAmount = function () {
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

periodicSavingSchema.pre<IPeriodicSaving>('save', function (next) {
  if (
    this.isModified('interval') ||
    this.isModified('lastExecutionTime') ||
    this.isNew
  ) {
    const lastExecution = this.lastExecutionTime || new Date();
    this.nextExecutionTime = calculateNextExecutionTime(
      lastExecution,
      this.interval
    );
  }
  next();
});

periodicSavingSchema.methods.updateLastExecution = async function () {
  this.lastExecutionTime = new Date();
  this.nextExecutionTime = calculateNextExecutionTime(
    this.lastExecutionTime,
    this.interval
  );
  return this.save();
};

periodicSavingSchema.methods.addTransaction = async function (
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
  if (status === TransactionStatus.CONFIRMED) {
    this.updateTotalAmount();
  }
  return this.save();
};

periodicSavingSchema.statics.findDueExecutions = function () {
  return this.find({
    isActive: true,
    nextExecutionTime: { $lte: new Date() },
  }).sort({ nextExecutionTime: 1 });
};

periodicSavingSchema.statics.findByPoolId = function (poolId: string) {
  return this.findOne({ poolId });
};

periodicSavingSchema.statics.findActiveByUser = function (userId: string) {
  return this.find({ userId, isActive: true });
};

export const PeriodicSaving = mongoose.model<
  IPeriodicSaving,
  IPeriodicSavingModel
>('PeriodicSaving', periodicSavingSchema);
