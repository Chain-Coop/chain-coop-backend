import { Schema, Document, model } from "mongoose";

export interface SavingCircleDocument extends Document {
  name: string;
  description: string;
  status: "pending" | "active" | "completed";
  members: Array<{
    userId: Schema.Types.ObjectId;
    contribution: number;
    status: "pending" | "active" | "completed";
    cardData?: string;
    failures?: number;
  }>;
  createdDate: Date;
  updatedDate: Date;
  currency: string;
  amount: number;
  balance: number;
  duration: number;
  frequency: number;
  nextContributionDate: Date;
  progress?: number;
  startDate?: Date;
  endDate?: Date;
  interestRate?: number;
  interestAmount?: number;
  goalAmount?: number;
  currentIndividualTotal?: number;
  type?: string;
  createdBy?: Schema.Types.ObjectId;
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
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
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
        status: {
          type: String,
          enum: ["pending", "active", "completed"],
          default: "pending",
        },
        cardData: {
          type: String,
        },
        failures: {
          type: Number,
          default: 0,
        },
      },
    ],
    type: {
      type: String,
      enum: ["free", "time"],
      default: "time",
    },
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
      default: 0,
    },
    duration: {
      type: Number,
    },
    frequency: {
      type: Number,
    },
    nextContributionDate: {
      type: Date,
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
    },
    progress: {
      type: Number,
      default: 0,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
    },
    interestRate: {
      type: Number,
      default: 0,
    },
    interestAmount: {
      type: Number,
      default: 0,
    },
    goalAmount: {
      type: Number,
      default: 0,
    },
    currentIndividualTotal: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export default model<SavingCircleDocument>("SavingCircle", SavingCircleSchema);
