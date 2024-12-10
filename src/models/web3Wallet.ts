import mongoose, { Schema, Document, Types } from "mongoose";
import User, { UserDocument } from "./user";


export interface Web3WalletDocument extends Document {
  user: Types.ObjectId | UserDocument; 
  encryptedKey: string;
  publicKey: string;
  address: string;
}

const Web3WalletSchema: Schema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId, 
      ref: "User",
      required: true,
    },
    encryptedKey: {
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
      unique: true,
    },
  },
  {
    timestamps: true, 
  }
);

// Create the Web3Wallet model
const Web3Wallet =
  mongoose.models.Web3Wallet ||
  mongoose.model<Web3WalletDocument>("Web3Wallet", Web3WalletSchema);

export default Web3Wallet;
