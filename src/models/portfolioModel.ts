import { Schema, model, Document } from "mongoose";

export interface PortfolioDocument extends Document {
  netWorthAsset: number;
  assetType: number;
  author: string;
}

const PortfolioSchema = new Schema({
  netWorthAsset: { type: Number, required: true },
  assetType: { type: Number, required: true },
  author: { type: Schema.Types.ObjectId, ref: "User", required: true },
});

export default model<PortfolioDocument>("Portfolio", PortfolioSchema);