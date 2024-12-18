import { Schema, Document, model } from "mongoose";

export interface SavingCircleDocument extends Document {
  name: string;
  description: string;
  status: "pending" | "active" | "completed";
  members: Array<{
    userId: Schema.Types.ObjectId;
    contribution: number;
  }>;
  createdDate: Date;
  updatedDate: Date;
  currency: string;
  balance: number;
  duration: number;
  frequency: String;
  nextContributionDate: Date;
}

const SavingCircleSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Circle name is required"],
    },
    description: {
      type: String,
      required: [true, "Circle description is required"],
    },
    status: {
      type: String,
      enum: ["pending", "active", "completed"],
      default: "pending",
    },
    members: [
      {
        userId: {
          type: Schema.Types.ObjectId,
          ref: "User",
          required: [true, "User ID is required"],
        },
        contribution: {
          type: Number,
          required: [true, "Contribution is required"],
        },
      },
    ],
    createdDate: {
      type: Date,
      default: Date.now,
    },
    updatedDate: {
      type: Date,
      default: Date.now,
    },
    currency: {
      type: String,
      required: [true, "Currency is required"],
    },
    balance: {
      type: Number,
      required: [true, "Balance is required"],
    },
    duration: {
      type: Number,
      required: [true, "Duration is required"],
    },
    frequency: {
      type: String,
      required: [true, "Frequency is required"],
    },
    nextContributionDate: {
      type: Date,
      required: [true, "Next contribution date is required"],
    },
  },
  { timestamps: true }
);

export default model<SavingCircleDocument>("SavingCircle", SavingCircleSchema);
