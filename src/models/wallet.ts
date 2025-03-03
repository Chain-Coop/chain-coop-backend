import { Schema, model } from "mongoose";
import bcrypt from "bcryptjs";

export interface ICard {
  number: string;
  authCode: string;
  isPreferred: boolean;
  failedAttempts: number;
  data: string;
}

export interface WalletDocument extends Document {
  balance: number;
  pin: string;
  user: Schema.Types.ObjectId;
  isPinCreated: boolean;
  bankAccounts: Array<{
    accountNumber: string;
    bankCode: string;
    accountName: string;
    bankId: number;
    bankName: string;
  }>;
  fundedProjects: Array<fundedProject>;
  Card?: {
    data: string;
    failedAttempts: number;
  };
  allCards: ICard[];
  hasWithdrawnBefore: boolean;
  bvn?: string;
}

export type fundedProject = {
  amount: number;
  projectId: any;
};

const WalletSchema = new Schema<WalletDocument>(
  {
    balance: Number,
    pin: { type: String },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    bvn: {
      type: String,
    },
    isPinCreated: {
      type: Boolean,
      default: false,
    },
    bankAccounts: [
      {
        accountNumber: String,
        bankCode: String,
        accountName: String,
        bankId: Number,
        bankName: String,
      },
    ],
    fundedProjects: [
      {
        amount: {
          type: Number,
        },
        projectId: {
          type: Schema.Types.ObjectId,
          ref: "Project",
        },
        _id: false,
      },
    ],
    hasWithdrawnBefore: {
      type: Boolean,
      default: false,
    },
    Card: {
      data: String,
      failedAttempts: Number,
    },
  },
  { timestamps: true }
);

WalletSchema.pre("save", async function (next) {
  if (!this.isModified("pin")) {
    return next();
  }
  const salt = await bcrypt.genSaltSync(10);
  const pinHash = await bcrypt.hashSync(this.pin!, salt);
  this.pin = pinHash;
  next();
});

export default model<WalletDocument>("Wallet", WalletSchema);
