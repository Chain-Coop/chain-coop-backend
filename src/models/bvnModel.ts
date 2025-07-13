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

export default model<IBVNLog>('BVNLog', BVNLogSchema);
