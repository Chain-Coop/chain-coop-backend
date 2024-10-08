import { Schema, model } from "mongoose";

export interface ContributionHistoryDocument extends Document {
  contribution: Schema.Types.ObjectId;
  user: Schema.Types.ObjectId;
  amount: number;
  status: string;
  date: Date;
}

const ContributionHistorySchema = new Schema({
  contribution: {
    type: Schema.Types.ObjectId,
    ref: 'Contribution',
    required: true
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  contributionPlan: {
    type: String,   // Add contributionPlan to schema
    required: true
  },
  savingsCategory: {
    type: String,   // Add savingsCategory to schema
    required: true
  },
  frequency: {
    type: String,   // Add frequency to schema
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Completed'], // Ensure the status enum includes "Completed"
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });
export default model<ContributionHistoryDocument>("ContributionHistory", ContributionHistorySchema);
