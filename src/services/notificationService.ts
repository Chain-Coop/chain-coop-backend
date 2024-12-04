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
const getUserNotifications = async (userId: string, filters: any) => {
  const { searchString, startDate, endDate, isRead } = filters;

  // Base query to include both 'All' and user-specific notifications
  let query: any = {
      $or: [{ audience: 'All' }, { audience: 'User', userId }],
  };

  // Add searchString filter
  if (searchString) {
      query.$or.push({
          $or: [
              { title: { $regex: searchString, $options: 'i' } },
              { message: { $regex: searchString, $options: 'i' } },
          ],
      });
  }

  // Add date range filter
  if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  // Fetch notifications
  const notifications = await notificationModel.find(query);

  // Fetch read statuses for the user
  const readStatuses = await userNotificationStatusModel.find({ userId });

  // Map and append the isRead field
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
