
import mongoose, { model, Schema, Document } from "mongoose";

export interface IVantWallet extends Document {
    userId: mongoose.Types.ObjectId;
    contributionId: mongoose.Types.ObjectId;
    email: string,
    walletName?: string,
    walletBalance: number,
    accountNumbers: {
        account_name: string;
        account_number: string;
        bank: string;
    }[];
    status: 'pending' | 'active' | 'failed';
    errorMessage?: string;
    totalInwardTransfers?: number;
    totalOutwardTransfers?: number;
    transactionCount?: number;
    lastTransactionDate?: Date;
}

export interface IVantTransaction extends Document {
    walletId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    reference: string;
    amount: number;
    type: 'inward' | 'outward';
    status: 'successful' | 'failed' | 'pending';
    accountNumber: string;
    originatorAccountNumber?: string;
    originatorAccountName?: string;
    originatorBank?: string;
    originatorBankName?: string;
    destinationAccountNumber?: string;
    destinationAccountName?: string;
    destinationBank?: string;
    destinationBankName?: string;
    narration?: string;
    meta?: any;
    timestamp: Date;
    sessionId?: string;
}


const VantWalletSchema = new Schema<IVantWallet>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        contributionId: {
            type: Schema.Types.ObjectId,
            ref: 'Contribution',
            index: true
        },
        email: { type: String, required: true, unique: true },
        walletName: { type: String },
        walletBalance: { type: Number, default: 0 },
        accountNumbers: [{
            account_name: { type: String, required: true },
            account_number: { type: String, required: true },
            bank: { type: String, required: true }
        }],
        status: {
            type: String,
            enum: ['pending', 'active', 'failed'],
            default: 'pending'
        },
        errorMessage: { type: String },
        totalInwardTransfers: { type: Number, default: 0 },
        totalOutwardTransfers: { type: Number, default: 0 },
        transactionCount: { type: Number, default: 0 },
        lastTransactionDate: { type: Date }
    },

    { timestamps: true }
);

const VantTransactionSchema = new Schema<IVantTransaction>(
    {
        walletId: {
            type: Schema.Types.ObjectId,
            ref: 'VantWallet',
            required: true,
            index: true
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        reference: {
            type: String,
            required: true,
            unique: true,
            index: true
        },
        amount: {
            type: Number,
            required: true
        },
        type: {
            type: String,
            enum: ['inward', 'outward'],
            required: true,
            index: true
        },
        status: {
            type: String,
            enum: ['successful', 'failed', 'pending'],
            required: true,
            index: true
        },
        accountNumber: {
            type: String,
            required: true,
            index: true
        },
        originatorAccountNumber: {
            type: String,
            index: true
        },
        originatorAccountName: {
            type: String
        },
        originatorBank: {
            type: String
        },
        originatorBankName: {
            type: String
        },
        destinationAccountNumber: {
            type: String,
            index: true
        },
        destinationAccountName: {
            type: String
        },
        destinationBank: {
            type: String
        },
        destinationBankName: {
            type: String
        },
        narration: {
            type: String
        },
        meta: {
            type: Schema.Types.Mixed
        },
        timestamp: {
            type: Date,
            required: true,
            index: true
        },
        sessionId: {
            type: String
        },
    },
    { timestamps: true }
);


VantWalletSchema.index({ userId: 1, status: 1 });

// Compound indexes for efficient queries
VantTransactionSchema.index({ userId: 1, type: 1, status: 1 });
VantTransactionSchema.index({ walletId: 1, timestamp: -1 });
VantTransactionSchema.index({ originatorAccountNumber: 1, timestamp: -1 });


export const VantWallet = model<IVantWallet>("VantWallet", VantWalletSchema);
export const VantTransaction = model<IVantTransaction>("VantTransaction", VantTransactionSchema);
