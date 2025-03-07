import { Schema, Document, model } from "mongoose";
import crypto from "crypto";

export interface SavingCircleDocument extends Document {
  name: string;
  description: string;
  status: "pending" | "active" | "completed";
  groupType: "open" | "closed";
  inviteCode?: string;
  members: Array<{
    userId: Schema.Types.ObjectId;
    contribution: number;
    status: "pending" | "active" | "completed";
    cardData?: string;
    failures?: number;
  }>;
  invitedUsers?: Schema.Types.ObjectId[];
  createdBy: Schema.Types.ObjectId;
  createdDate: Date;
  updatedDate: Date;
  currency: string;
  amount: number;
  balance: number;
  duration: number;
  frequency: number;
  nextContributionDate?: Date;
  progress?: number;
  startDate?: Date;
  endDate?: Date;
  interestRate?: number;
  interestAmount?: number;
  goalAmount?: number;
  currentIndividualTotal?: number;
  type?: "free" | "time";
}

const SavingCircleSchema = new Schema<SavingCircleDocument>(
  {
    name: { type: String, required: [true, "Circle name is required"] },
    description: { type: String, required: [true, "Circle description is required"] },
    status: { type: String, enum: ["pending", "active", "completed"], default: "pending" },
    groupType: { type: String, enum: ["open", "closed"], required: true, default: "closed" },

    inviteCode: {
      type: String,
      validate: {
        validator: function (this: SavingCircleDocument) {
          return this.groupType === "open" || !!this.inviteCode;
        },
        message: "Invite code is required when group type is closed",
      },
    },

    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: [true, "User ID is required"] },

    members: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: [true, "User ID is required"] },
        contribution: { type: Number, required: [true, "Contribution is required"] },
        status: { type: String, enum: ["pending", "active", "completed"], default: "pending" },
        cardData: { type: String },
        failures: { type: Number, default: 0 },
      },
    ],

    invitedUsers: [{ type: Schema.Types.ObjectId, ref: "User" }],

    type: { type: String, enum: ["free", "time"], default: "time" },
    currency: { type: String, required: [true, "Currency is required"] },
    balance: { type: Number, default: 0 },
    duration: { type: Number },
    frequency: { type: Number },
    amount: { type: Number, required: [true, "Amount is required"] },
    progress: { type: Number, default: 0 },
    
    nextContributionDate: {
      type: Date,
      default: function (this: SavingCircleDocument) {
        return this.frequency ? new Date(Date.now() + this.frequency * 24 * 60 * 60 * 1000) : null;
      },
    },

    startDate: { type: Date, default: Date.now },
    
    endDate: {
      type: Date,
      default: function (this: SavingCircleDocument) {
        return this.duration ? new Date(Date.now() + this.duration * 24 * 60 * 60 * 1000) : null;
      },
    },

    interestRate: { type: Number, default: 0 },
    interestAmount: { type: Number, default: 0 },
    goalAmount: { type: Number, default: 0 },
    currentIndividualTotal: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Pre-save middleware to generate inviteCode if groupType is "closed" and inviteCode is missing
SavingCircleSchema.pre<SavingCircleDocument>("save", function (next) {
  if (this.groupType === "closed" && !this.inviteCode) {
    this.inviteCode = crypto.randomBytes(6).toString("hex").toUpperCase(); // Generates a 6-character invite code
  }
  next();
});

export default model<SavingCircleDocument>("SavingCircle", SavingCircleSchema);
