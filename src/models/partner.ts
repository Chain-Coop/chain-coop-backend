import mongoose, { Schema, Document } from "mongoose";

export interface IPartner extends Document {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  reason: string;
  createdAt: Date;
}

const PartnerSchema = new Schema<IPartner>(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    reason: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model<IPartner>("Partner", PartnerSchema);
