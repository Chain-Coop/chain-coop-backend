import { Schema, model, Document } from "mongoose";

export interface ContributionDetailDocument extends Document {
  user: Schema.Types.ObjectId;
  contributionId: Schema.Types.ObjectId;
  contributionPlan: string;
  amount: number;
  currency: string; 
  startDate?: Date;
  endDate?: Date;
  status: string;
  paymentReference?: string;
  lastChargeDate?: Date;
}

const ContributionDetailSchema = new Schema<ContributionDetailDocument>(
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
    contributionId: {
      type: Schema.Types.ObjectId,
      ref: "Contribution",
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
    startDate: {
      type: Date,
    },
    endDate: {
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

export default model<ContributionDetailDocument>("ContributionDetail", ContributionDetailSchema);
