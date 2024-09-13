import { Schema, model } from "mongoose";

export interface MembershipDocument extends Document {
  user: Schema.Types.ObjectId;
  membershipType: string;
  status: string;
  paymentMethod: string;
  amount: number;
  activationDate: Date;
  bankReceiptUrl?: string;
  subscriptionUrl?: string; // Add this field
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
    status: {
      type: String,
      enum: ["Active", "Pending"],
      default: "Pending",
    },
    paymentMethod: {
      type: String,
      enum: ["BankTransfer", "DebitCreditCard", "PaystackSubscription"], // Add PaystackSubscription
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
    subscriptionUrl: { // Add this field
      type: String,
    },
  },
  { timestamps: true }
);

export default model<MembershipDocument>("Membership", MembershipSchema);
