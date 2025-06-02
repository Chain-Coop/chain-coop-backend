// models/transaction.model.ts

import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  circleId: { type: mongoose.Schema.Types.ObjectId, ref: "SavingCircle", required: true },
  amount: { type: Number, required: true },
  type: { type: String, enum: ["credit", "debit"], required: true },
  reference: { type: String },
  status: { type: String, enum: ["success", "failed", "pending"], required: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Transaction", transactionSchema);
