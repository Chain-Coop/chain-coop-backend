import { Schema, model, Document } from "mongoose";

export interface ContributionDocument extends Document {
  user: Schema.Types.ObjectId;
  contributionPlan: string; // Frequency (e.g., "Weekly", "Monthly")
  savingsCategory: string;  // Specific savings category (e.g., "Rent", "School Fees")
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
      enum: ["Daily", "Weekly", "Monthly", "Yearly"], // Frequency options
      required: true,
    },
    savingsCategory: {
      type: String,
      enum: ["House Rent", "School Fees", "Food", "Personal Need", "Car", "Others"],
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
