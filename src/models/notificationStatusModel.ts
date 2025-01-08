import { model, Schema, Types } from "mongoose";

interface UserNotificationStatusDocument extends Document {
  userId:  Schema.Types.ObjectId;
  notificationId:  Schema.Types.ObjectId;
  isRead: boolean;
  readAt?: Date;
}

const UserNotificationStatusSchema = new Schema<UserNotificationStatusDocument>({
  userId: { type: Types.ObjectId, ref: "User", required: true },
  notificationId: { type: Types.ObjectId, ref: "Notification", required: true },
  isRead: { type: Boolean, default: false },
  readAt: Date,
});

UserNotificationStatusSchema.index(
  { userId: 1, notificationId: 1 },
  { unique: true }
); 

export default model<UserNotificationStatusDocument>("NotificationStatus", UserNotificationStatusSchema);
