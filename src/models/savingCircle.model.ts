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
  depositAmount: number;
  balance: number;
  depositFrequency: "Daily" | "Weekly" | "Monthly" | "Quarterly";
  nextContributionDate?: Date;
  progress?: number;
  startDate?: Date;
  endDate?: Date;
  interestRate?: number;
  interestAmount?: number;
  goalAmount?: number;
  currentIndividualTotal?: number;
  duration?: number; // add this
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

    currency: { type: String, required: [true, "Currency is required"] },
    balance: { type: Number, default: 0 },
    depositAmount: { type: Number, required: [true, "Amount is required"] },
    depositFrequency: { type: String, enum: ["Daily", "Weekly", "Monthly", "Quarterly"] },
    
    progress: { type: Number, default: 0 },
    
    startDate: { type: Date, default: Date.now },

    nextContributionDate: {
      type: Date,
      default: function (this: SavingCircleDocument) {
        if (!this.startDate || !this.depositFrequency) return null;
        const freqDays = mapFrequencyToDays(this.depositFrequency);
        const nextDate = new Date(this.startDate);
        nextDate.setDate(nextDate.getDate() + freqDays);
        return nextDate;
      },
    },

    endDate: {
      type: Date,
      default: function (this: SavingCircleDocument) {
        if (!this.startDate || !this.duration) return null;
        const endDate = new Date(this.startDate);
        endDate.setDate(endDate.getDate() + this.duration);
        return endDate;
      },
    },

    interestRate: { type: Number, default: 0 },
    interestAmount: { type: Number, default: 0 },
    goalAmount: { type: Number, default: 0 },
    currentIndividualTotal: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Helper to map saving frequency to number of days
function mapFrequencyToDays(frequency: "Daily" | "Weekly" | "Monthly" | "Quarterly"): number {
  switch (frequency) {
    case "Daily":
      return 1;
    case "Weekly":
      return 7;
    case "Monthly":
      return 30;
    case "Quarterly":
      return 90;
    default:
      return 30;
  }
}

// Pre-save middleware to generate inviteCode if groupType is "closed" and inviteCode is missing
SavingCircleSchema.pre<SavingCircleDocument>("save", function (next) {
  if (this.groupType === "closed" && !this.inviteCode) {
    this.inviteCode = crypto.randomBytes(6).toString("hex").toUpperCase(); // Generates a 6-character invite code
  }
  next();
});

export default model<SavingCircleDocument>("SavingCircle", SavingCircleSchema);
