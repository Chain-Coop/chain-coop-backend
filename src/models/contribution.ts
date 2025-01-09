import { Schema, model, Document } from "mongoose";

export interface ContributionDocument extends Document {
  user: Schema.Types.ObjectId;
  contributionPlan: string;
  savingsCategory: string;
  amount: number;
  currency: string; // Add this line to define the currency field
  startDate?: Date;
  endDate?: Date;
  categoryBalances: Record<string, number>;
  balance: number;
  nextContributionDate?: Date;
  lastContributionDate?: Date;
  withdrawalDate?: Date;
  status: string;
  paymentReference?: string;
  lastChargeDate?: Date;
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
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {  // Add this line in your schema
      type: String,
      required: true, 
      , default: "NGN", // or optional depending on your requirements
    },
    categoryBalances: {
      type: Map,
      of: Number,
      required: true,
      default: {},
    },
    balance: {
      type: Number,
      required: true,
      default: 0,
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    nextContributionDate: {
      type: Date,
    },
    lastContributionDate: {
      type: Date,
    },
    withdrawalDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["Pending", "Completed"],
      default: "Pending",
    },
    paymentReference: { type: String },
    lastChargeDate: {
      type: Date,
      default: Date.now(),
    },
  },
  { timestamps: true }
);

export default model<ContributionDocument>("Contribution", ContributionSchema);
