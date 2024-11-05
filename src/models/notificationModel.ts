import mongoose, { Schema, Document, model } from 'mongoose';

interface NotificationDocument extends Document {
  title: string;
  message: string;
  audience: 'All' | 'User';
  userId?: Schema.Types.ObjectId; 
  createdAt: Date;
}

const NotificationSchema = new Schema<NotificationDocument>({
  title: { type: String, required: true },
  message: { type: String, required: true },
  audience: { type: String, enum: ['All', 'User'], required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
});


export default model<NotificationDocument>("Notification", NotificationSchema);
