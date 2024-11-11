import mongoose from "mongoose";
import notificationModel from "../models/notificationModel";
import userNotificationStatusModel from "../models/notificationStatusModel";
import Notification from "../models/notificationModel";


interface CreateNotificationInput {
    title: string;
    message: string;
    audience: 'All' | 'User';
    userId?: string; 
}

// Create a general notification
const createGlobalNotification = (title: string, message: string) => {
  return Notification.create({
    title,
    message,
    audience: 'All',
  });
};

// Create a user-specific notification
const createUserNotification = async (
  userId: string,
  title: string,
  message: string
) => {
  return notificationModel.create({
    title,
    message,
    audience: 'User',
    userId,
  });
};

// Get notifications for a specific user
const getUserNotifications = async (userId: string) => {
    const notifications = await notificationModel.find({
        $or: [{ audience: 'All' }, { audience: 'User', userId }],
    });

    const readStatuses = await userNotificationStatusModel.find({ userId });

    return notifications.map(notification => ({
        ...notification.toObject(),
        isRead: readStatuses.some(rs => rs.notificationId.toString() === notification.id.toString()),
    }));

};

// Mark a notification as read by a user
const markAsRead = async (
  notificationId: string,
  userId: string
) => {
    return userNotificationStatusModel.updateOne(
        { userId, notificationId },
        { isRead: true, readAt: new Date() },
        { upsert: true } 
    );
};

export {
  createGlobalNotification,
  createUserNotification,
  getUserNotifications,
  markAsRead,
};
