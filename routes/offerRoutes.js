import express from "express";

import {
    showOfferForm,
    createOffer,
    showOffers,
    showOfferDetails,
    acceptOffer,
    declineOffer,
    withdrawOffer
} from "../controllers/offerController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();


router.get(
    "/trade/:id/offer",
    requireAuth,
    showOfferForm
);


router.post(
    "/trade/:id/offer",
    requireAuth,
    createOffer
);
router.get(
    "/offers",
    requireAuth,
    showOffers
);
router.get(
    "/offers/:id",
    requireAuth,
    showOfferDetails
);


router.post(
    "/offers/:id/accept",
    requireAuth,
    acceptOffer
);


router.post(
    "/offers/:id/decline",
    requireAuth,
    declineOffer
);
router.post(
    "/offers/:id/withdraw",
    requireAuth,
    withdrawOffer
);

export default router;