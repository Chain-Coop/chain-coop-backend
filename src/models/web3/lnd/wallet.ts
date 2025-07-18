// models/Wallet.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface ILndWallet extends Document {
  userId: mongoose.Types.ObjectId;
  balance: number;
  lockedBalance: number;
  lock: ILockEntry[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ILockEntry {
  amount: number;
  lockedAt: Date;
  maturityDate: Date;
  purpose?: string;
  lockId: string;
}

const LockEntrySchema: Schema = new Schema({
  amount: {
    type: Number,
    min: 0,
  },
  lockedAt: {
    type: Date,
    default: Date.now,
  },
  maturityDate: {
    type: Date,
    default: Date.now,
  },
  purpose: {
    type: String,
    default: 'staking',
  },
  lockId: {
    type: String,
    unique: true,
    sparse: true,
  },
});

const LndWalletSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    balance: {
      type: Number,
      default: 0,
    },
    lockedBalance: {
      type: Number,
      default: 0,
    },
    lock: [LockEntrySchema],
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<ILndWallet>('LndWallet', LndWalletSchema);

