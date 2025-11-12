import { Schema, model } from 'mongoose';

const RecipientSchema = new Schema(
  {
    email: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, required: false },
    status: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' },
    error: { type: String },
  },
  { _id: false }
);

const EmailJobSchema = new Schema(
  {
    jobId: { type: String, required: true, unique: true },
    type: { type: String, enum: ['individual', 'bulk', 'campaign'], required: true },
    status: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' },
    emailType: { type: String, enum: ['KYC_REMINDER', 'ACTIVATION_REMINDER', 'REENGAGEMENT', 'NEWSLETTER', 'RAW'], required: true },
    recipients: { type: [RecipientSchema], default: [] },
    criteria: { type: Schema.Types.Mixed },
    totalCount: { type: Number, default: 0 },
    successCount: { type: Number, default: 0 },
    failureCount: { type: Number, default: 0 },
    scheduledAt: { type: Date, default: Date.now },
    startedAt: { type: Date },
    completedAt: { type: Date },
    error: { type: String },
    retryCount: { type: Number, default: 0 },
    maxRetries: { type: Number, default: 3 },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

const EmailJob = model('EmailJob', EmailJobSchema);
export default EmailJob;