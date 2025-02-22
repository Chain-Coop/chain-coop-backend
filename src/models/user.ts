import mongoose, { Schema, Document } from "mongoose";

// Extend the UserDocument interface to include membershipType
export interface UserDocument extends Document {
  email: string;
  password: string;
  membershipStatus: "active" | "pending" | "inactive";
  membershipPaymentStatus: "paid" | "in-progress" | "not_started";
  membershipType: "Explorer" | "Pioneer" | "Voyager";
  whatsappNumber: string;
  phoneNumber: string;
  Tier: 0 | 1 | 2;
  isVerified: boolean;
  isCrypto: boolean;
}

const UserSchema: Schema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  membershipStatus: {
    type: String,
    enum: ["active", "pending", "inactive"],
    default: "inactive",
  },
  membershipPaymentStatus: {
    type: String,
    enum: ["paid", "in-progress", "not_started"],
    default: "not_started",
  },
  membershipType: {
    type: String, // Adjust this if there are specific membership types
    enum: ["Explorer", "Pioneer", "Voyager"],
    required: false,
  },
  whatsappNumber: {
    type: String,
    required: false,
  },
  phoneNumber: {
    type: String,
    required: false,
  },
  Tier: {
    type: Number,
    required: false,
    enum: [0, 1, 2],
    default: 0,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  isCrypto: {
    type: Boolean,
    default: false,
  },
  kycSessionId: { type: String },
});

const User =
  mongoose.models.User || mongoose.model<UserDocument>("User", UserSchema);

export default User;