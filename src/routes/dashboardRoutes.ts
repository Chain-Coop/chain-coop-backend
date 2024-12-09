import express from "express";
import { getDashboardStats, getUserMembershipStats, getUsersInfo } from "../controllers/dashboardController"; 
import { authorize, authorizePermissions } from "../middlewares/authorization";

const router = express.Router();

// routes for fetching dashboard stats
router.get("/users-stats", authorize, authorizePermissions("admin"), getDashboardStats);

router.get("/users-membership-stats", authorize, authorizePermissions("admin"), getUserMembershipStats);

router.get("/users-info", authorize, authorizePermissions("admin"), getUsersInfo);

export default router;
