import { Document, Schema, Types, model } from 'mongoose';

export interface IBVNLog extends Document {
    userId: Types.ObjectId;
    bvnNumber: string;
    attemptStatus: 'success' | 'failure';
    status: string;
    firstnameMatch: boolean;
    lastnameMatch: boolean;
    verificationState: string,
    verificationStatus: string;
    errorMessage?: string;
    attemptDate: Date;
}

const BVNLogSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        bvnNumber: {
            type: String,
            required: true,
            index: true,
        },
        attemptStatus: {
            type: String,
            enum: ['success', 'failure'],
            required: true,
        },
        status: {
            type: String,
            required: true,
            default: 'unknown',
        },
        firstnameMatch: {
            type: Boolean,
            required: true,
            default: false,
        },
        lastnameMatch: {
            type: Boolean,
            required: true,
            default: false,
        },
        verificationState: {
            type: String,
            required: true,
            default: 'unknown',
        },
        verificationStatus: {
            type: String,
            required: true,
            default: 'unknown',
        },
        manualNamesUsed: {
            type: {
                firstName: String,
                lastName: String
            },
            required: false
        },
        errorMessage: {
            type: String,
        },
        attemptDate: {
            type: Date,
            default: Date.now,
            required: true,
        },

    },
    { timestamps: true }
);

BVNLogSchema.index({ userId: 1, attemptDate: -1 });
BVNLogSchema.index({ userId: 1, attemptStatus: 1, attemptDate: -1 });

export const BVNLog = model<IBVNLog>('BVNLog', BVNLogSchema);


export interface IFailedTransaction extends Document {
    type: 'withdrawal' | 'deposit';
    reference: string;
    userId?: Types.ObjectId;
    walletId?: Types.ObjectId;
    reason: string;
    data: any;
    createdAt: Date;
}

const FailedTransactionSchema = new Schema<IFailedTransaction>({
    type: { 
        type: String,
        enum: ['withdrawal', 'deposit'], 
        required: true 
    },
    reference: { 
        type: String, 
        required: true, 
        unique: true 
    },
    userId: { 
        type: Schema.Types.ObjectId, 
        ref: 'User' 
    },
    walletId: { 
        type: Schema.Types.ObjectId, 
        ref: 'VantWallet' 
    },
    reason: { 
        type: String, 
        required: true 
    },
    data: { type: Schema.Types.Mixed, required: true },
    createdAt: { type: Date, default: Date.now },
});

export const FailedTransaction = model<IFailedTransaction>('FailedTransaction', FailedTransactionSchema);

