import mongoose from "mongoose";

const withdrawalSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  amount: { type: Number, required: true },
  bankDetails: {
    accountNumber: { type: String, required: true },
    bankCode: { type: String, required: true },
    accountName: { type: String, required: true },
    bankName: { type: String, required: true },
  },
  status: {
    type: String,
    enum: ["pending", "completed", "accepted", "rejected", "failed"],
    default: "pending",
  },
  createdAt: { type: Date, default: Date.now },
});

const Withdrawal = mongoose.model("Withdrawal", withdrawalSchema);

export default Withdrawal;
