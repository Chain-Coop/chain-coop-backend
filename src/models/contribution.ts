import { Schema, model, Document } from "mongoose";

export interface ContributionDocument extends Document {
  user: Schema.Types.ObjectId;
  contributionPlan: string;
  savingsCategory: string;
  savingsType: "Flexible" | "Lock" | "Strict"; 
  amount: number;
  currency: string; 
  startDate?: Date;
  endDate?: Date;
  savingsDuration?: number;
  categoryBalances: Record<string, number>;
  balance: number;
  nextContributionDate?: Date;
  lastContributionDate?: Date;
  withdrawalDate?: Date;
  status: string;
  paymentReference?: string;
  lastChargeDate?: Date;
  contributionType: "one-time" | "auto";
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
      enum: ["Daily", "Weekly", "Monthly", "Yearly", "5Minutes"],
      required: function () {
        return this.savingsType !== "Strict";
      },
    },
    savingsCategory: {
      type: String,
    },
    savingsType: {
      type: String,
      enum: ["Flexible", "Lock", "Strict"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {  
      type: String,
      required: false, 
      default: "NGN", 
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
    savingsDuration: {
      type: Number,
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
    contributionType: {
      type: String,
      enum: ["one-time", "auto"],
      required: true,
    },
  },
  { timestamps: true }
);

// Pre-save middleware to calculate savingsDuration
ContributionSchema.pre<ContributionDocument>("save", function (next) {
  if (this.savingsType === "Strict") {
    if (this.startDate && this.endDate) {
      const durationInMilliseconds = this.endDate.getTime() - this.startDate.getTime();
      this.savingsDuration = durationInMilliseconds / (1000 * 60 * 60 * 24); // Convert to days
    } else {
      const err = new Error("Both startDate and endDate must be provided for Strict savingsType.");
      return next(err);
    }
  }
  next();
});

export default model<ContributionDocument>("Contribution", ContributionSchema);