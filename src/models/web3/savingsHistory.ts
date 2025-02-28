import { Schema, Document } from 'mongoose';

// Enum for success status
export enum SuccessStatus {
  FAILED = 'failed',
  SUCCESS = 'success',
}

// Interface for SavingsHistory
export interface ISavingsHistory extends Document {
  locktype: string;
  amount: number;
  date: Date;
  isSuccess: SuccessStatus;
}

// SavingsHistory Schema
export const SavingsHistorySchema = new Schema<ISavingsHistory>({
  locktype: { type: String, required: true },
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  isSuccess: { type: String, enum: Object.values(SuccessStatus), required: true },
});
