import express from "express";

import {
    showPayments,
    showOfferPayment,
    processOfferPayment,
    showPaymentSuccess
} from "../controllers/paymentController.js";

import {
    requireAuth
} from "../middleware/authMiddleware.js";


const router = express.Router();
router.get(
    "/payments",
    requireAuth,
    showPayments
);


router.get(
    "/payments/offer/:offerId",
    requireAuth,
    showOfferPayment
);


router.post(
    "/payments/offer/:offerId",
    requireAuth,
    processOfferPayment
);


router.get(
    "/payments/:paymentId/success",
    requireAuth,
    showPaymentSuccess
);


export default router;