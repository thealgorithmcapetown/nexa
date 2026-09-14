import express from "express";

import {
    showMessages,
    showChat,
    sendMessage,
    getUnreadMessageCount,
    markChatAsRead
} from "../controllers/messageController.js";
import {
    requireAuth
} from "../middleware/authMiddleware.js";


const router = express.Router();


router.get(
    "/messages",
    requireAuth,
    showMessages
);

router.get(
    "/api/messages/unread-count",
    requireAuth,
    getUnreadMessageCount
);
router.patch(
    "/api/messages/:shopId/read",
    requireAuth,
    markChatAsRead
);

router.get(
    "/messages/:shopId",
    requireAuth,
    showChat
);


router.post(
    "/messages/:shopId",
    requireAuth,
    sendMessage
);


export default router;