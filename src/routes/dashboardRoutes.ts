import express from "express";
import { 
  getDashboardStats, 
  getUserMembershipStats, 
  getUsersInfo 
} from "../controllers/dashboardController"; 
import { authorize, authorizePermissions } from "../middlewares/authorization";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: API endpoints for dashboard-related statistics and user information.
 */

/**
 * @swagger
 * /dashboard/users-stats:
 *   get:
 *     summary: Fetch Dashboard Statistics
 *     description: Retrieve overall user statistics including total users, verified users, and unverified users.
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics fetched successfully.
 *         content:
 *           application/json:
 *             example:
 *               totalUsers: 1000
 *               verifiedUsers: 800
 *               unverifiedUsers: 200
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Internal Server Error
 */

/**
 * @swagger
 * /dashboard/users-membership-stats:
 *   get:
 *     summary: Fetch User Membership Stats
 *     description: Retrieve user membership statistics including membership types, statuses, and payment statuses.
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Membership stats fetched successfully.
 *         content:
 *           application/json:
 *             example:
 *               membershipStatus:
 *                 Active: 700
 *                 Inactive: 300
 *               membershipPaymentStatus:
 *                 Paid: 600
 *                 Unpaid: 400
 *               membershipType:
 *                 Gold: 300
 *                 Silver: 400
 *                 Bronze: 300
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Internal Server Error
 */

/**
 * @swagger
 * /dashboard/users-info:
 *   get:
 *     summary: Fetch Users Information
 *     description: Retrieve detailed information for all users including names, contact details, and membership information.
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Users info fetched successfully.
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 - firstName: John
 *                   lastName: Doe
 *                   username: johndoe
 *                   email: johndoe@example.com
 *                   phoneNumber: 123-456-7890
 *                   membershipType: Gold
 *                   membershipStatus: Active
 *                   membershipPaymentStatus: Paid
 *                   Tier: 1
 *                   isVerified: true
 *                 - firstName: Jane
 *                   lastName: Smith
 *                   username: janesmith
 *                   email: janesmith@example.com
 *                   phoneNumber: 987-654-3210
 *                   membershipType: Silver
 *                   membershipStatus: Inactive
 *                   membershipPaymentStatus: Unpaid
 *                   Tier: 2
 *                   isVerified: false
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Internal Server Error
 */

// Routes for fetching dashboard stats
router.get("/users-stats", authorize, authorizePermissions("admin"), getDashboardStats
);

router.get("/users-membership-stats", authorize, authorizePermissions("admin"), getUserMembershipStats
);

router.get("/users-info", authorize, authorizePermissions("admin"), getUsersInfo
);

export default router;
