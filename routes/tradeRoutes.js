import express from "express";

import {

    showTradeBoard,
    showCreateTrade,
    createTradeRequest,
    showTradeDetails,
    showMyRequests,
    fulfillTrade,
    completeTrade

} from "../controllers/tradeController.js";


import {
    requireAuth
} from "../middleware/authMiddleware.js";


const router = express.Router();


// ========================================
// TRADE BOARD
// ========================================

router.get(
    "/trade",
    requireAuth,
    showTradeBoard
);


// ========================================
// CREATE TRADE
// ========================================

router.get(
    "/trade/create",
    requireAuth,
    showCreateTrade
);


router.post(
    "/trade/create",
    requireAuth,
    createTradeRequest
);


// ========================================
// MY REQUESTS
// ========================================

router.get(
    "/trade/my-requests",
    requireAuth,
    showMyRequests
);


// ========================================
// FULFIL TRADE
// Seller only
// ========================================

router.post(
    "/trade/:id/fulfill",
    requireAuth,
    fulfillTrade
);


// ========================================
// COMPLETE TRADE
// Buyer only
// ========================================

router.post(
    "/trade/:id/complete",
    requireAuth,
    completeTrade
);


// ========================================
// TRADE DETAILS
// Keep this AFTER the specific routes
// ========================================

router.get(
    "/trade/:id",
    requireAuth,
    showTradeDetails
);


export default router;