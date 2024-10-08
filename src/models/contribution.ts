import { Schema, model, Document } from "mongoose";

export interface ContributionDocument extends Document {
  user: Schema.Types.ObjectId;
  contributionPlan: string;  // Daily, Weekly, Monthly
  savingsCategory: string;   // House Rent, School Fees, etc.
  frequency: string;         // Daily, Weekly, Monthly
  amount: number;
  startDate?: Date;          // New start date field
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
      enum: ["Daily", "Weekly", "Monthly", "Yearly"],
      required: true,
    },
    savingsCategory: {        // New field for savings category
      type: String,
      enum: ["House Rent", "School Fees", "Food", "Personal Need", "Car", "Others"],
      required: true,
    },
    frequency: {              // New field for savings frequency
      type: String,
      enum: ["Daily", "Weekly", "Monthly"],
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
    startDate: {              // Start date for the contribution
      type: Date,
      required: true,
    },
    endDate: {                // End date for the contribution
      type: Date,
      required: false,
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
