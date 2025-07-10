import mongoose, { Schema, Document, Types } from 'mongoose';
import User, { UserDocument } from './user';
import { getBitcoinBalance } from '../services/web3/accountService';

export interface IBitcoinWallet extends Document {
  user: Types.ObjectId | UserDocument;
  encryptedPrivateKey: string;
  encryptedWif: string;
  publicKey: string;
  address: string;
  walletType: string; // To distinguish between wallet types (e.g., "segwit", "legacy")
  // Lock fields
  lock: BitcoinLockEntry[];
}

export interface BitcoinLockEntry {
  lockedAmount: number;
  lockedAmountSatoshis: number;
  lockDuration: number;
  lockedAt: Date;
  maturityDate: Date;
  purpose?: string;
  lockId: string;
}

const BitcoinLockEntrySchema: Schema = new Schema({
  lockedAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  lockedAmountSatoshis: {
    type: Number,
    required: true,
    min: 0,
  },
  lockDuration: {
    type: Number,
    required: true,
    min: 0,
  },
  lockedAt: {
    type: Date,
    default: Date.now,
  },
  maturityDate: {
    type: Date,
    required: true,
  },
  purpose: {
    type: String,
    default: 'staking',
  },
  lockId: {
    type: String,
    unique: true,
    required: true,
  },
});

const BitcoinWalletSchema: Schema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // Ensure a user can only have one Bitcoin wallet
    },
    encryptedPrivateKey: {
      type: String,
      required: true,
    },
    encryptedWif: {
      type: String,
      required: true,
    },
    publicKey: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
      unique: true, // Bitcoin addresses must be unique
      index: true, // Index for faster queries by address
    },
    walletType: {
      type: String,
      required: true,
      default: 'segwit',
      enum: ['segwit', 'legacy', 'taproot'], // Define acceptable wallet types
    },
    lock: [BitcoinLockEntrySchema],
  },
  {
    timestamps: true,
  }
);
// Create the BitcoinWallet model
const BitcoinWallet = mongoose.model<IBitcoinWallet>(
  'BitcoinWallet',
  BitcoinWalletSchema
);

export default BitcoinWallet;
