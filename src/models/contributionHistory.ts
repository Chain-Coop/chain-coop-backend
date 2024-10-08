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
    type: String,   
    required: true
  },
  savingsCategory: {
    type: String,   
    required: true
  },
  frequency: {
    type: String, 
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Completed'],  
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });
export default model<ContributionHistoryDocument>("ContributionHistory", ContributionHistorySchema);
