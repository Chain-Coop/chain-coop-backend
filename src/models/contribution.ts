import { Schema, model, Document } from "mongoose";

export interface ContributionDocument extends Document {
  user: Schema.Types.ObjectId;
  contributionPlan: string; 
  savingsCategory: string; 
  amount: number;
  startDate?: Date;
  endDate?: Date;
  categoryBalances: Record<string, number>; 
  balance: number; 
  nextContributionDate?: Date;
  lastContributionDate?: Date;
  status: string;
  paymentReference?: string;
}

const ContributionSchema = new Schema<ContributionDocument>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    contributionPlan: {
      type: String,
      enum: ["Daily", "Weekly", "Monthly", "Yearly"],
      required: true,
    },
    savingsCategory: {
      type: String, 
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    categoryBalances: {
      type: Map,
      of: Number,
      required: true,
      default: {}
    },
    balance: {
      type: Number,
      required: true,
      default: 0,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: false,
    },
    nextContributionDate: {
      type: Date,
    },
    lastContributionDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["Pending", "Completed"],
      default: "Pending",
    },
    paymentReference: { type: String },
  },
  { timestamps: true }
);

export default model<ContributionDocument>("Contribution", ContributionSchema);
