import { Schema, model, Document } from 'mongoose';
import { ISavingsHistory, SavingsHistorySchema } from './savingsHistory';

// Interface for UserSavings
export interface IUserSavings extends Document {
  user_id: Schema.Types.ObjectId;
  locktype: string;
  amount: number;
  reason_for_saving: string;
  savingsHistory: ISavingsHistory[];
}

// UserSavings Schema
const UserSavingsSchema = new Schema<IUserSavings>({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  locktype: { type: String, required: true },
  amount: { type: Number, required: true },
  reason_for_saving: { type: String, required: true },
  savingsHistory: { type: [SavingsHistorySchema], default: [] },
});

const UserSavings = model<IUserSavings>('UserSavings', UserSavingsSchema);
export default UserSavings;
