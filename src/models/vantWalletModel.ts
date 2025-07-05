
import mongoose, { model, Schema, Document } from "mongoose";

export interface IVantWallet extends Document {
    userId: mongoose.Types.ObjectId;
    walletName?: string,
    walletBalance: number,
    accountNumbers: {
        accountName: string;
        accountNumber: string;
        bank: string;
    }[];
    status: 'pending' | 'active' | 'failed';
}

const VantWalletSchema = new Schema<IVantWallet>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        walletName: { type: String },
        walletBalance: { type: Number, default: 0 },
        accountNumbers: [{
            accountName: { type: String, required: true },
            accountNumber: { type: String, required: true },
            bank: { type: String, required: true }
        }],
        status: {
            type: String,
            enum: ['pending', 'active', 'failed'],
            default: 'pending'
        },
    },

    { timestamps: true }
);

VantWalletSchema.index({ userId: 1, status: 1 });

const VantWallet = model<IVantWallet>("VantWallet", VantWalletSchema);

export default VantWallet;
