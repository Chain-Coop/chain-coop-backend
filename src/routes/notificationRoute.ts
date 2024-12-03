import { Router } from "express";

import { authorize, authorizePermissions } from "../middlewares/authorization";
import { createNotification, findNotifications, markNotificationAsRead } from "../controllers/notificationController";

const router = Router();

router.post("/", authorize, authorizePermissions("admin"), createNotification);
router.get("/", authorize, findNotifications);
router.post("/read/:notificationId", authorize, markNotificationAsRead);


export default router;
