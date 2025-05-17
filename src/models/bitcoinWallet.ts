import mongoose, { Schema, Document, Types } from "mongoose";
import User, { UserDocument } from "./user";

export interface IBitcoinWallet extends Document {
  user: Types.ObjectId | UserDocument;
  encryptedPrivateKey: string;
  encryptedWif: string;
  publicKey: string;
  address: string;
  walletType: string; // To distinguish between wallet types (e.g., "segwit", "legacy")
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
    }
  },
  {
    timestamps: true,
  }
);

// Create the BitcoinWallet model
const BitcoinWallet =
  mongoose.models.BitcoinWallet ||
  mongoose.model<IBitcoinWallet>("BitcoinWallet", BitcoinWalletSchema);

export default BitcoinWallet;