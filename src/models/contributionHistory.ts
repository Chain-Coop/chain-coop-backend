import mongoose, { Document, Schema } from "mongoose";

export interface ContributionHistoryDocument extends Document {
  contribution: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  amount: number;
  contributionPlan: string;
  savingsCategory: string;
  status: string;
  startDate: Date;
  endDate: Date;
  nextContributionDate: Date;
  lastContributionDate: Date;
  totalBalance: number;
  categoryBalances: Map<string, number>;
}

const contributionHistorySchema = new Schema<ContributionHistoryDocument>({
  contribution: { type: Schema.Types.ObjectId, ref: "Contribution", required: true },
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  amount: { type: Number, required: true },
  contributionPlan: { type: String, required: true },
  savingsCategory: { type: String, required: true },
  status: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  nextContributionDate: { type: Date, required: true },
  lastContributionDate: { type: Date, required: true },
  totalBalance: { type: Number, required: true },
  categoryBalances: { type: Map, of: Number, default: {} },
}, { timestamps: true });

export default mongoose.model<ContributionHistoryDocument>("ContributionHistory", contributionHistorySchema);
