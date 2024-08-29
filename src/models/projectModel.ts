import { Document, Schema, model } from "mongoose";

export interface ProjectDocument extends Document {
  title: string;
  description: string;
  status: "pending" | "approved" | "rejected";
  author: Schema.Types.ObjectId;
  createdDate: Date;
  updatedDate: Date;
  documentUrl: string; 
  fundBalance: number;
}

const ProjectSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, "Project title is required"],
    },
    description: {
      type: String,
      required: [true, "Project description is required"],
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    fundBalance: {
      type: Number,
      default: 0,
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

export default model<ProjectDocument>("Project", ProjectSchema);
