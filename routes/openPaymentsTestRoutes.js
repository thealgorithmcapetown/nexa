import express from "express";

import {
    startRealPaymentTest,
    finishRealPaymentTest
} from "../controllers/openPaymentsTestController.js";


const router =
    express.Router();


router.get(
    "/open-payments/test",
    startRealPaymentTest
);


router.get(
    "/open-payments/test/callback",
    finishRealPaymentTest
);


export default router;