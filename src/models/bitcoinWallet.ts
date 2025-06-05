import mongoose, { Schema, Document, Types } from "mongoose";
import User, { UserDocument } from "./user";
import { getBitcoinBalance } from "../services/web3/accountService";

export interface IBitcoinWallet extends Document {
  user: Types.ObjectId | UserDocument;
  encryptedPrivateKey: string;
  encryptedWif: string;
  publicKey: string;
  address: string;
  walletType: string; // To distinguish between wallet types (e.g., "segwit", "legacy")
  // Lock fields
  lockedAmount: number;
  lockedAmountSatoshis: number;
  lockDuration: number; // Lock duration in seconds (0 means no lock)
  lockedAt?: Date;
  unlocksAt?: Date;
  isLocked: boolean;
  lockReason?: string;

}

const BitcoinWalletSchema: Schema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
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
      default: "segwit",
      enum: ["segwit", "legacy", "taproot"], // Define acceptable wallet types
    },
    lockedAmount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    lockedAmountSatoshis: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    lockDuration: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    lockedAt: {
      type: Date,
      required: false,
    },
    unlocksAt: {
      type: Date,
      required: false,
    },
    isLocked: {
      type: Boolean,
      required: true,
      default: false,
    },
    lockReason: {
      type: String,
      required: false,
      maxlength: 100,
    },
  },
  {
    timestamps: true,
  }
);

// Add a method to check if lock has expired
BitcoinWalletSchema.methods.checkAndUpdateLockStatus = function () {
  if (this.isLocked && this.unlocksAt && new Date() >= this.unlocksAt) {
    this.isLocked = false;
    this.lockedAmount = 0;
    this.lockedAmountSatoshis = 0;
    this.lockDuration = 0;
    this.lockedAt = undefined;
    this.unlocksAt = undefined;
    this.lockReason = undefined;
    return true; // Lock was cleared
  }
  return false; // Lock still active or no lock
};

BitcoinWalletSchema.methods.getAvailableBalance = async function () {
  const lockCleared = this.checkAndUpdateLockStatus();
  if (lockCleared) {
    await this.save();
  }

  const totalBalance = await getBitcoinBalance(this.user.toString());

  return Math.max(0, totalBalance - this.lockedAmount);
};


// Create the BitcoinWallet model
const BitcoinWallet =
  mongoose.models.BitcoinWallet ||
  mongoose.model<IBitcoinWallet>("BitcoinWallet", BitcoinWalletSchema);

export default BitcoinWallet;