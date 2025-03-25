import { Router } from "express";

import { authorize, authorizePermissions } from "../middlewares/authorization";
import { createNotification, findNotifications, markNotificationAsRead } from "../controllers/notificationController";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: Notification management
 */

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   schemas:
 *     Notification:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Unique identifier for the notification
 *         title:
 *           type: string
 *           description: The title of the notification
 *         message:
 *           type: string
 *           description: The content of the notification
 *         audience:
 *           type: string
 *           enum: [All, User]
 *           description: The target audience of the notification
 *         userId:
 *           type: string
 *           description: ID of the user (if the notification is user-specific)
 *         isRead:
 *           type: boolean
 *           description: Whether the notification has been read by the user
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The timestamp when the notification was created
 */

/**
 * @swagger
 * /notification:
 *   post:
 *     summary: Create a new global notification
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: Title of the notification
 *               message:
 *                 type: string
 *                 description: Content of the notification
 *     responses:
 *       200:
 *         description: Notification created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Notification'
 *       403:
 *         description: Forbidden (Admin-only endpoint)
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /notification:
 *   get:
 *     summary: Get a paginated list of notifications for the user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: searchString
 *         schema:
 *           type: string
 *         description: Text to search in notification titles or messages
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering notifications
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering notifications
 *       - in: query
 *         name: isRead
 *         schema:
 *           type: boolean
 *         description: Filter notifications by their read status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: The page number to retrieve
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: The number of notifications per page
 *     responses:
 *       200:
 *         description: Successfully fetched notifications
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalCount:
 *                   type: integer
 *                   description: Total number of notifications matching the filters
 *                 page:
 *                   type: integer
 *                   description: Current page number
 *                 limit:
 *                   type: integer
 *                   description: Number of notifications per page
 *                 notifications:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Notification'
 *       401:
 *         description: Unauthorized (invalid or missing token)
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /notification/read/{notificationId}:
 *   post:
 *     summary: Mark a notification as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the notification to mark as read
 *     responses:
 *       200:
 *         description: Notification marked as read successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 msg:
 *                   type: string
 *                   description: Confirmation message
 *       401:
 *         description: Unauthorized (invalid or missing token)
 *       404:
 *         description: Notification not found
 *       500:
 *         description: Internal server error
 */

router.post("/", authorize, authorizePermissions("admin"), createNotification);
router.get("/", authorize, findNotifications);
router.post("/read/:notificationId", authorize, markNotificationAsRead);

export default router;
