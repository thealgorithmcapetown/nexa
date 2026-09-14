import express from "express";

import {
    showTradeBoard,
    showCreateTrade,
    createTradeRequest,
    showTradeDetails,
    showMyRequests
} from "../controllers/tradeController.js";

import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/trade", requireAuth, showTradeBoard);

router.get("/trade/create", requireAuth, showCreateTrade);

router.post("/trade/create", requireAuth, createTradeRequest);

router.get(
    "/trade/my-requests",
    requireAuth,
    showMyRequests
);

router.get("/trade/:id", requireAuth, showTradeDetails);

export default router;