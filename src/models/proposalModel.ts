import { Document, Schema, model } from "mongoose";

export interface ProposalDocument extends Document {
  title: string;
  description: string;
  status: "pending" | "approved" | "rejected";
  author: Schema.Types.ObjectId;
  createdDate: Date;
  updatedDate: Date;
  documentUrl: string; 
}

const ProposalSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, "Proposal title is required"],
    },
    description: {
      type: String,
      required: [true, "Proposal description is required"],
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Author is required"],
    },
    createdDate: {
      type: Date,
      default: Date.now,
    },
    updatedDate: {
      type: Date,
      default: Date.now,
    },
    documentUrl: {
      type: String,
      required: false,
  },
  },
  { timestamps: true }
);

export default model<ProposalDocument>("Proposal", ProposalSchema);
