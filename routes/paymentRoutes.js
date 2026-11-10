
import express from "express";

import {
    showPayments,
    showOfferPayment,
    processOfferPayment,
    finishOfferOpenPayment,
    showPaymentSuccess,
    showSendMoney,
    processSendMoney,
    finishSendMoney,
    showReceiveMoney,
    createPaymentRequest,
    showGeneratedPaymentRequest,
    showCustomerPayment,
    startCustomerOpenPayment,
    finishCustomerOpenPayment,
    getPaymentRequestStatus
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
    "/payments/requests/:paymentRequestId/status",
    requireAuth,
    getPaymentRequestStatus
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

router.post(
    "/payments/send",
    requireAuth,
    processSendMoney
);

router.get(
    "/payments/send/open-payments/callback",
    requireAuth,
    finishSendMoney
);

router.post(
    "/pay/:paymentRequestId/open-payments",
    startCustomerOpenPayment
);

router.get(
    "/pay/:paymentRequestId/open-payments/callback",
    finishCustomerOpenPayment
);

router.get(
    "/pay/:paymentRequestId",
    showCustomerPayment
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
    "/payments/offer/:offerId/open-payments/callback",
    requireAuth,
    finishOfferOpenPayment
);

router.get(
    "/payments/:paymentId/success",
    requireAuth,
    showPaymentSuccess
);

export default router;
