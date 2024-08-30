import { Schema, model } from "mongoose";

export interface ContributionHistoryDocument extends Document {
  contribution: Schema.Types.ObjectId;
  user: Schema.Types.ObjectId;
  amount: number;
  status: string;
  date: Date;
}

const ContributionHistorySchema = new Schema<ContributionHistoryDocument>(
  {
    contribution: {
      type: Schema.Types.ObjectId,
      ref: "Contribution",
      required: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Completed"],
      required: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default model<ContributionHistoryDocument>("ContributionHistory", ContributionHistorySchema);
