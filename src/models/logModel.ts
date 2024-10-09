import mongoose, { Schema, Document } from "mongoose";

interface LogDocument extends Document {
  userId: string;
  timestamp: string;
  operation: string;
  url: string;
  status: number;
  ip: string;
  userAgent: string;
}

const LogSchema: Schema = new Schema({
  userId: { type: String, required: true },
  timestamp: { type: String, required: true },
  operation: { type: String, required: true },
  url: { type: String, required: true },
  status: {
    type: String,
    enum: ["Success", "Failure"],
  },
  ip: { type: String, required: true },
  userAgent: { type: String, required: true },
});

export const LogModel = mongoose.model<LogDocument>("Log", LogSchema);
