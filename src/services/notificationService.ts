import mongoose from "mongoose";
import notificationModel from "../models/notificationModel";
import userNotificationStatusModel from "../models/notificationStatusModel";
import Notification from "../models/notificationModel";
import User from "../models/user";


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

  // Get the user's creation date
  const user = await User.findById(userId);
  const userCreationDate = user?.createdAt;

  console.log(userCreationDate)

  // Fetch the welcome messages (no date filtering)
  let queryWelcomeMessages: any = { title: "welcome message" };

  // Add searchString filter for welcome messages
  if (searchString) {
    queryWelcomeMessages.$or = [
      { title: { $regex: searchString, $options: 'i' } },
      { message: { $regex: searchString, $options: 'i' } },
    ];
  }

  // Fetch welcome messages
  const welcomeMessages = await notificationModel
    .find(queryWelcomeMessages)
    .sort({ createdAt: -1 })
    .lean();

  // Fetch user-specific notifications
  let queryUserNotifications: any = {
    $or: [{ audience: 'All' }, { audience: 'User', userId }],
  };

  // Add filter for notifications after user creation date
  if (userCreationDate) {
    queryUserNotifications.createdAt = { $gte: userCreationDate };
  }

  // Add searchString filter for user notifications
  if (searchString) {
    queryUserNotifications.$or.push({
      $or: [
        { title: { $regex: searchString, $options: 'i' } },
        { message: { $regex: searchString, $options: 'i' } },
      ],
    });
  }

  // Add date range filter for user notifications
  if (startDate || endDate) {
    queryUserNotifications.createdAt = queryUserNotifications.createdAt || {};
    if (startDate) queryUserNotifications.createdAt.$gte = new Date(startDate);
    if (endDate) queryUserNotifications.createdAt.$lte = new Date(endDate);
  }

  // Fetch user-specific notifications
  const userNotifications = await notificationModel
    .find(queryUserNotifications)
    .sort({ createdAt: -1 })
    .lean();

  // Combine both sets of notifications
  const notifications = [...welcomeMessages, ...userNotifications];

  // Sort the combined notifications by createdAt in descending order
  notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Fetch read statuses for the user
  const readStatuses = await userNotificationStatusModel.find({ userId });

  // Enrich notifications with isRead field
  const enrichedNotifications = notifications.map((notification) => ({
    ...notification,
    isRead: readStatuses.some(
      (rs) => rs.notificationId.toString() === notification._id.toString()
    ),
  }));

  // Filter unread notifications to calculate `totalCount`
  const unreadNotifications = enrichedNotifications.filter(
    (notification) => notification.isRead === false
  );
  const totalCount = unreadNotifications.length;

  // Apply additional filters if `isRead` or pagination parameters are provided
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
