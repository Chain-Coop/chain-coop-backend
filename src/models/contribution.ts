import { Schema, model, Document } from "mongoose";

export interface ContributionDocument extends Document {
  user: Schema.Types.ObjectId;
  contributionPlan: string;
  amount: number;
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
      enum: ["Daily", "Weekly", "Monthly", "Yearly"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    balance: { 
      type: Number, 
      required: true, 
      default: 0 
    },
    nextContributionDate: { 
      type: Date 
    },
    lastContributionDate: {
      type: Date 
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
