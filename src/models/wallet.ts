import { Schema, model } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface WalletDocument extends Document {
    balance: number;
    pin: string;
    user: Schema.Types.ObjectId;
    isPinCreated: boolean;
    bankDetails?: {
        accountNumber: string;
        bankCode: string;
    };
}

const WalletSchema = new Schema<WalletDocument>(
    {
        balance: Number,
        pin: { type: String },
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
        isPinCreated: {
            type: Boolean,
            default: false,
        },
        bankDetails: {
            accountNumber: String,
            bankCode: String,
        }
    },
    { timestamps: true }
);

WalletSchema.pre('save', async function (next) {
    if (this.pin === undefined) {
        return;
    }
    const salt = await bcrypt.genSaltSync(10);
    const pinHash = await bcrypt.hashSync(this.pin!, salt);
    this.pin = pinHash;
    next();
});

export default model<WalletDocument>('Wallet', WalletSchema);
