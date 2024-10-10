import { Schema, model, Document } from "mongoose";

export interface ContributionDocument extends Document {
  user: Schema.Types.ObjectId;
  contributionPlan: string;
  savingsCategory: string; 
  frequency: string; 
  amount: number;
  startDate?: Date;
  endDate?: Date;
  balance: number;
  nextContributionDate?: Date;
  lastContributionDate?: Date;
  status: string;
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
      enum: ["Daily Rent", "Weekly Rent", "Monthly Rent", "Weekly School Fees", "Monthly School Fees", "Daily Food", "Monthly Car", "Others"],
      required: true,
    },
    savingsCategory: {
      type: String,
      required: true,
    },
    frequency: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
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
  },
  { timestamps: true }
);

export default model<ContributionDocument>("Contribution", ContributionSchema);
