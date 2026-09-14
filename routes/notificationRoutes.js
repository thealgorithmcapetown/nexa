import express from "express";

import {
    showNotifications,
    openNotification,
    getUnreadNotificationCount
} from "../controllers/notificationController.js";
import {
    requireAuth
} from "../middleware/authMiddleware.js";


const router = express.Router();


router.get(
    "/notifications",
    requireAuth,
    showNotifications
);
router.get(
    "/notifications/:id",
    requireAuth,
    openNotification
);
router.get(
    "/api/notifications/unread-count",
    requireAuth,
    getUnreadNotificationCount
);

export default router;