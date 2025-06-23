// models/GenerateCryproAddress.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IGenerateCryproAddress extends Document {
  userId: mongoose.Types.ObjectId;
  assetType: string;
  network: string;
  amount: number;
  requestId: string,
  address: string,
  code: string,
  status: string,
  customerId?: string
}

const GenerateCryproAddressSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    assetType: {
      type: String,
      required: true
    },
    network: {
      type: String,
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    requestId: {
      type: String,
      required: true
    },
    address: {
      type: String,
      required: true,
      unique: true
    },
    code: {
      type: String,
      required: true
    },
    status: {
      type: String,
      required: true
    },
    customerId: {
      type: String,
    },
  },
  {
    timestamps: true
  }
);

const GenerateCryproAddress = mongoose.model<IGenerateCryproAddress>('GenerateCryproAddress', GenerateCryproAddressSchema);

export default GenerateCryproAddress;