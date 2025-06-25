// models/BTCAddress.ts
import mongoose, { Schema, Document } from 'mongoose';

// ================= BTC Address =================

export interface IBTCAddress extends Document {
  userId: mongoose.Types.ObjectId;
  assetType: string;
  requestId: string;
  address: string;
  code: string;
  status: string;
  customerId?: string;
}

const BTCAddressSchema: Schema = new Schema(
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
      type: String
    }
  },
  {
    timestamps: true
  }
);

// One BTC address per user
BTCAddressSchema.index({ userId: 1 }, { unique: true });

export const BTCAddress = mongoose.model<IBTCAddress>('BTCAddress', BTCAddressSchema);
// export default BTCAddress;

// ================= Lightning Address =================

export interface ILightningAddress extends Document {
  userId: mongoose.Types.ObjectId;
  assetType: string;
  amount: number;
  balance: number;
  requestId: string;
  address: string;
  code: string;
  status: string;
  customerId?: string;
  expiresAt: Date;
}

const LightningAddressSchema: Schema = new Schema(
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
    amount: {
      type: Number,
      required: true
    },
    balance: {
      type: Number,
      required: true,
      default: 0,
    },
    requestId: {
      type: String,
      required: true
    },
    address: {
      type: String,
      required: true
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
      type: String
    },
    expiresAt: {
      type: Date,
    }
  },
  {
    timestamps: true
  }
);

// Pre-save middleware to set expiry
LightningAddressSchema.pre('save', function (next) {
  if (!this.expiresAt) {
    this.expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  }
  next();
});

// TTL index for auto-expiry
LightningAddressSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Index for efficient queries
LightningAddressSchema.index({ userId: 1, status: 1 });
LightningAddressSchema.index({ address: 1 });

export const LightningAddress = mongoose.model<ILightningAddress>('LightningAddress', LightningAddressSchema);
