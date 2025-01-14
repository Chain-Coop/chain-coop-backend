import mongoose, { Document, Schema } from "mongoose";

export interface ContributionHistoryDocument extends Document {
  contribution: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  Date: Date;
  type: string;
  balance: number;
  status: string;
  reference: string;
}

const contributionHistorySchema = new Schema<ContributionHistoryDocument>(
  {
    contribution: {
      type: Schema.Types.ObjectId,
      ref: "Contribution",
      required: true,
    },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true },
    currency: { type: String, required: true },
    Date: { type: Date, default: Date.now },
    type: { type: String, required: true },
    balance: { type: Number, required: true },
    status: { type: String, required: true },
    reference: { type: String, unique: true },
  },
  { timestamps: true }
);

export default mongoose.model<ContributionHistoryDocument>(
  "ContributionHistory",
  contributionHistorySchema
);
