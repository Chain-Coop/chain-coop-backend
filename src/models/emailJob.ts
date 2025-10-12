import mongoose, { Schema, Document } from "mongoose";

export interface EmailJobDocument extends Document {
  jobId: string;
  type: "individual" | "bulk" | "campaign" | "custom_bulk";
  status: "pending" | "processing" | "completed" | "failed";
  emailType?: "KYC_REMINDER" | "ACTIVATION_REMINDER" | "REENGAGEMENT";
  recipients: Array<{
    email: string;
    userId?: string;
    status: "pending" | "sent" | "failed";
    error?: string;
    sentAt?: Date;
  }>;
  criteria?: object;
  totalCount: number;
  successCount: number;
  failureCount: number;
  scheduledAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  retryCount: number;
  maxRetries: number;
  // Custom email fields
  subject?: string;
  content?: string;
  isHtml?: boolean;
  results?: Array<{
    email: string;
    status: "sent" | "failed";
    messageId?: string;
    error?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const EmailJobSchema: Schema = new Schema({
  jobId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  type: {
    type: String,
    enum: ["individual", "bulk", "campaign", "custom_bulk"],
    required: true,
    index: true,
  },
  status: {
    type: String,
    enum: ["pending", "processing", "completed", "failed"],
    default: "pending",
    index: true,
  },
  emailType: {
    type: String,
    enum: ["KYC_REMINDER", "ACTIVATION_REMINDER", "REENGAGEMENT"],
    required: false,
    index: true,
  },
  recipients: [{
    email: {
      type: String,
      required: true,
    },
    userId: {
      type: String,
      required: false,
    },
    status: {
      type: String,
      enum: ["pending", "sent", "failed"],
      default: "pending",
    },
    error: {
      type: String,
      required: false,
    },
    sentAt: {
      type: Date,
      required: false,
    },
  }],
  criteria: {
    type: Schema.Types.Mixed,
    required: false,
  },
  totalCount: {
    type: Number,
    required: true,
    default: 0,
  },
  successCount: {
    type: Number,
    required: true,
    default: 0,
  },
  failureCount: {
    type: Number,
    required: true,
    default: 0,
  },
  scheduledAt: {
    type: Date,
    required: true,
    default: Date.now,
    index: true,
  },
  startedAt: {
    type: Date,
    required: false,
  },
  completedAt: {
    type: Date,
    required: false,
  },
  error: {
    type: String,
    required: false,
  },
  retryCount: {
    type: Number,
    required: true,
    default: 0,
  },
  maxRetries: {
    type: Number,
    required: true,
    default: 3,
  },
  // Custom email fields
  subject: {
    type: String,
    required: false,
  },
  content: {
    type: String,
    required: false,
  },
  isHtml: {
    type: Boolean,
    required: false,
    default: false,
  },
  results: [{
    email: {
      type: String,
      required: false,
    },
    status: {
      type: String,
      enum: ["sent", "failed"],
      required: false,
    },
    messageId: {
      type: String,
      required: false,
    },
    error: {
      type: String,
      required: false,
    },
  }],
}, {
  timestamps: true,
});

// Indexes for performance
EmailJobSchema.index({ status: 1, scheduledAt: 1 });
EmailJobSchema.index({ type: 1, status: 1 });
EmailJobSchema.index({ emailType: 1, status: 1 });
EmailJobSchema.index({ createdAt: 1 });

const EmailJob = mongoose.models.EmailJob || mongoose.model<EmailJobDocument>("EmailJob", EmailJobSchema);

export default EmailJob;