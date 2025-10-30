import mongoose, { Schema, Document } from 'mongoose';

export interface IReferral extends Document {
  referrer: mongoose.Types.ObjectId;
  referee: mongoose.Types.ObjectId;
  referralCode: string;
  status: 'pending' | 'completed' | 'expired';
  rewardAmount: number;
  depositAmount: number;
  completedAt?: Date;
  createdAt: Date;
}

const ReferralSchema: Schema = new Schema({
  referrer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',  
    required: true,
    index: true,
  },
  referee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',  
    required: true,
    index: true,
  },
  referralCode: {
    type: String,
    required: true,
    index: true,
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'expired'],
    default: 'pending',
    index: true,
  },
  rewardAmount: {
    type: Number,
    required: true,
    default: 0,
  },
  depositAmount: {
    type: Number,
    default: 0,
  },
  completedAt: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model<IReferral>('Referral', ReferralSchema);