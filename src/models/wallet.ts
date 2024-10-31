import { Schema, model } from "mongoose";
import bcrypt from "bcryptjs";
import { all } from "axios";

export interface WalletDocument extends Document {
  balance: number;
  pin: string;
  user: Schema.Types.ObjectId;
  isPinCreated: boolean;
  bankDetails?: {
    accountNumber: string;
    bankCode: string;
  };
  fundedProjects: Array<fundedProject>;
  allCards?: Array<String>;
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
    isPinCreated: {
      type: Boolean,
      default: false,
    },
    bankDetails: {
      accountNumber: String,
      bankCode: String,
    },
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
    allCards: {
      type: [String],
    },
  },
  { timestamps: true }
);

WalletSchema.pre("save", async function (next) {
  if (this.pin === undefined) {
    return;
  }
  const salt = await bcrypt.genSaltSync(10);
  const pinHash = await bcrypt.hashSync(this.pin!, salt);
  this.pin = pinHash;
  next();
});

export default model<WalletDocument>("Wallet", WalletSchema);
