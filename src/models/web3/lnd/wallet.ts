// models/Wallet.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface ILndWallet extends Document {
  userId: mongoose.Types.ObjectId;
  balance: number;
  lockedBalance: number;
  lock: ILockEntry;
  createdAt: Date;
  updatedAt: Date;
}

export interface ILockEntry {
  amount: number;
  lockedAt: Date;
  maturityDate: Date;
  purpose?: string;
  lockId: string;
}

const LockEntrySchema: Schema = new Schema({
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  lockedAt: {
    type: Date,
    default: Date.now,
  },
  maturityDate: {
    type: Date,
    required: true,
    default: Date.now,
  },
  purpose: {
    type: String,
    default: 'staking',
  },
  lockId: {
    type: String,
    unique: true,
  },
});

const LndWalletSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    balance: {
      type: Number,
      default: 0,
    },
    lockedBalance: {
      type: Number,
      default: 0,
    },
    lock: LockEntrySchema,
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<ILndWallet>('LndWallet', LndWalletSchema);

// // models/Wallet.ts
// import mongoose, { Schema, Document } from 'mongoose';

// export interface ILndWallet extends Document {
//   userId: mongoose.Types.ObjectId;
//   onchainAddresses: Array<{
//     address: string;
//     format: string;
//     createdAt: Date;
//     label?: string;
//     isUsed: boolean;
//   }>;
//   currentAddress: string;
//   balance: {
//     onchain: number;
//     lightning: number;
//     pendingChannels: number;
//   };
//   createdAt: Date;
//   updatedAt: Date;
// }

// const LndWalletSchema: Schema = new Schema(
//   {
//     userId: {
//       type: Schema.Types.ObjectId,
//       ref: 'User',
//       required: true,
//       index: true,
//     },
//     onchainAddresses: [
//       {
//         address: {
//           type: String,
//           required: true,
//         },
//         format: {
//           type: String,
//           enum: ['p2wpkh', 'np2wpkh', 'p2pkh', 'p2tr'],
//           default: 'p2wpkh',
//         },
//         createdAt: {
//           type: Date,
//           default: Date.now,
//         },
//         label: {
//           type: String,
//         },
//         isUsed: {
//           type: Boolean,
//           default: false,
//         },
//       },
//     ],
//     currentAddress: {
//       type: String,
//     },
//     balance: {
//       onchain: {
//         type: Number,
//         default: 0,
//       },
//       lightning: {
//         type: Number,
//         default: 0,
//       },
//       pendingChannels: {
//         type: Number,
//         default: 0,
//       },
//     },
//   },
//   {
//     timestamps: true,
//   }
// );

// // Add indexes for faster queries
// LndWalletSchema.index({ 'onchainAddresses.address': 1 });
// LndWalletSchema.index({ currentAddress: 1 });

// export default mongoose.model<ILndWallet>('LndWallet', LndWalletSchema);
