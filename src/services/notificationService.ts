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
  const { searchString, startDate, endDate, isRead, page = 1, limit = 10 } = filters;

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

  // Fetch all matching notifications from the database
  const notifications = await notificationModel
    .find(query)
    .sort({ createdAt: -1 }) // Sort by latest notifications
    .lean();

  // Fetch read statuses for the user
  const readStatuses = await userNotificationStatusModel.find({ userId });

  // Enrich notifications with isRead field
  const enrichedNotifications = notifications.map((notification) => ({
    ...notification,
    isRead: readStatuses.some(
      (rs) => rs.notificationId.toString() === notification._id.toString()
    ),
  }));

  // **Step 1**: Filter unread notifications to calculate `totalCount`
  const unreadNotifications = enrichedNotifications.filter(
    (notification) => notification.isRead === false
  );
  const totalCount = unreadNotifications.length;

  // **Step 2**: Apply additional filters if `isRead` or pagination parameters are provided
  let filteredNotifications = enrichedNotifications;
  if (typeof isRead === 'string') {
    const isReadBoolean = isRead === 'true';
    filteredNotifications = enrichedNotifications.filter(
      (notification) => notification.isRead === isReadBoolean
    );
  }

  // Pagination for filtered notifications
  const skip = (page - 1) * limit;
  const paginatedNotifications = filteredNotifications.slice(skip, skip + limit);

  return { totalCount, notifications: paginatedNotifications };
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
