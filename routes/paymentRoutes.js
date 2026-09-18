import express from "express";

import {
    showPayments,
    showOfferPayment,
    processOfferPayment,
    showPaymentSuccess,
    showSendMoney,
    showReceiveMoney,
    createPaymentRequest,
    showGeneratedPaymentRequest,
    showCustomerPayment
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
    "/payments/send",
    requireAuth,
    showSendMoney
);


router.get(
    "/payments/receive",
    requireAuth,
    showReceiveMoney
);
router.post(
    "/payments/receive",
    requireAuth,
    createPaymentRequest
);


router.get(
    "/payments/receive/:paymentRequestId",
    requireAuth,
    showGeneratedPaymentRequest
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
router.get(
    "/pay/:paymentRequestId",
    showCustomerPayment
);

export default router;