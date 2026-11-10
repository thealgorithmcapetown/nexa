
import express from "express";

import {

    showTradeBoard,
    showCreateTrade,
    createTradeRequest,
    showTradeDetails,
    showMyRequests,
    fulfillTrade,
    completeTrade,
    cancelTrade

} from "../controllers/tradeController.js";


import {
    submitRating
} from "../controllers/ratingController.js";


import {
    requireAuth
} from "../middleware/authMiddleware.js";


const router = express.Router();


router.get(
    "/trade",
    requireAuth,
    showTradeBoard
);



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


router.get(
    "/trade/my-requests",
    requireAuth,
    showMyRequests
);


router.post(
    "/trade/:id/fulfill",
    requireAuth,
    fulfillTrade
);


router.post(
    "/trade/:id/complete",
    requireAuth,
    completeTrade
);

router.post(
    "/trade/:id/rate",
    requireAuth,
    submitRating
);


router.get(
    "/trade/:id",
    requireAuth,
    showTradeDetails
);

router.post(
    "/trade/:id/cancel",
    requireAuth,
    cancelTrade
);


export default router;
