import { Request, Response } from "express";
import { createGlobalNotification, getUserNotifications, markAsRead } from "../services/notificationService";
import { StatusCodes } from "http-status-codes";

export const createNotification = async (req: Request, res: Response) => {
    const { title, message } = req.body;
    const notification = await createGlobalNotification(title, message);
    if (!notification) {
        throw new Error("Notification not created");
    }
    res.status(StatusCodes.OK).json(notification);
};

export const findNotifications = async (req: Request, res: Response) => {
    //@ts-ignore
    const userId = req.user.userId;

    // Extract filters and pagination from query parameters
    const { searchString, startDate, endDate, isRead, page = 1, limit = 10 } = req.query;

    const { totalCount, notifications } = await getUserNotifications(userId, {
        searchString,
        startDate,
        endDate,
        isRead,
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
    });

    res.status(StatusCodes.OK).json({ 
        totalCount,
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
        notifications 
    });
};



  

export const markNotificationAsRead = async (req: Request, res: Response) => {
    const { notificationId } = req.params;
    //@ts-ignore
    const userId = req.user.userId;
    const notification = await markAsRead(notificationId, userId);
    if (notification.acknowledged === false) {
        throw new Error("Notification not marked as read");
    }
    res.status(StatusCodes.OK).json({ msg: "Notfication read" });
};