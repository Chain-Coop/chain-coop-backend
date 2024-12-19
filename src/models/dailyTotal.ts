import { Schema, model, Document } from "mongoose";

export interface DailyTotalDocument extends Document {
  user: Schema.Types.ObjectId;
  deposit: number;
  withdrawal: number;
  date: Date;
}

const DailyTotalSchema = new Schema<DailyTotalDocument>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    deposit: {
      type: Number,
      required: true,
      default: 0,
    },
    withdrawal: {
      type: Number,
      required: true,
      default: 0,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default model<DailyTotalDocument>("DailyTotal", DailyTotalSchema);
