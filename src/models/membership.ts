import { Schema, model } from "mongoose";

export interface MembershipDocument extends Document {
  user: Schema.Types.ObjectId;
  membershipType: string;
  status: string;
  paymentMethod: string;
  amount: number;
  activationDate: Date;
  bankReceiptUrl?: string;
  subscriptionUrl?: string;
  membershipPaymentStatus: 'paid' | 'in-progress' | 'not_started';
}

const MembershipSchema = new Schema<MembershipDocument>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    membershipType: {
      type: String,
      enum: ["Explorer", "Pioneer", "Voyager"],
      required: true,
    },
    membershipPaymentStatus: {
      type: String,
      enum: ['paid', 'in-progress', 'not_started'],
      default: 'not_started',
  },
    status: {
      type: String,
      enum: ["in-progress", "active", "pending"],
      default: "Pending",
    },
    paymentMethod: {
      type: String,
      enum: ["onceOff", "PaystackSubscription"], 
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    activationDate: {
      type: Date,
      default: Date.now,
    },
    bankReceiptUrl: {
      type: String,
    },
    subscriptionUrl: { 
      type: String,
    },
  },
  { timestamps: true }
);

export default model<MembershipDocument>("Membership", MembershipSchema);
