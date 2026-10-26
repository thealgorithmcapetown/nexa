import express from "express";

import {
    showNotifications,
    openNotification,
    getUnreadNotificationCount,
    markAllNotificationsRead
} from "../controllers/notificationController.js";

import {
    requireAuth
} from "../middleware/authMiddleware.js";


const router = express.Router();


// ========================================
// SHOW NOTIFICATIONS
// ========================================

router.get(
    "/notifications",
    requireAuth,
    showNotifications
);


// ========================================
// MARK ALL AS READ
// ========================================

router.post(
    "/notifications/mark-all-read",
    requireAuth,
    markAllNotificationsRead
);


// ========================================
// OPEN NOTIFICATION
// ========================================

router.get(
    "/notifications/:id",
    requireAuth,
    openNotification
);


// ========================================
// UNREAD NOTIFICATION COUNT
// ========================================

router.get(
    "/api/notifications/unread-count",
    requireAuth,
    getUnreadNotificationCount
);


export default router;