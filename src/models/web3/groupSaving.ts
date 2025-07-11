import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export interface ICircle extends Document {
  _id: Types.ObjectId;
  contractCircleId?: string;
  owner: Types.ObjectId;
  members: Types.ObjectId[];
  title: string;
  description?: string;
  depositAmount: string; // Store as string to handle BigNumber
  token: string;
  depositInterval: number; // in seconds
  circleStart: Date;
  maxDeposits: number;
  status: 'pending' | 'active' | 'completed' | 'decommissioned';
  isOnChain: boolean;
  transactionHash?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CircleSchema = new Schema<ICircle>(
  {
    contractCircleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      maxlength: 500,
    },
    depositAmount: {
      type: String,
      required: true,
      validate: {
        validator: function (v: string) {
          return /^\d+(\.\d+)?$/.test(v);
        },
        message: 'Invalid deposit amount format',
      },
    },
    token: {
      type: String,
      required: true,
      validate: {
        validator: function (v: string) {
          return /^0x[a-fA-F0-9]{40}$/.test(v);
        },
        message: 'Invalid token address format',
      },
    },
    depositInterval: {
      type: Number,
      min: 1,
    },
    circleStart: {
      type: Date,
    },
    maxDeposits: {
      type: Number,
      min: 1,
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'completed', 'decommissioned'],
      default: 'pending',
    },
    isOnChain: {
      type: Boolean,
      default: false,
    },
    transactionHash: String,
  },
  {
    timestamps: true,
  }
);

CircleSchema.index({ owner: 1, status: 1 });
CircleSchema.index({ members: 1, status: 1 });
CircleSchema.index({ contractCircleId: 1 }, { unique: true, sparse: true });

CircleSchema.pre('save', function (next) {
  // Ensure owner is included in members
  if (this.isNew && !this.members.includes(this.owner)) {
    this.members.push(this.owner);
  }
  next();
});

export const Circle = mongoose.model<ICircle>('Circle', CircleSchema);
