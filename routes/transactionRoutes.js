import express from "express";

import {
    showTransactions,
    showTransactionDetails
} from "../controllers/transactionController.js";

import {
    requireAuth
} from "../middleware/authMiddleware.js";


const router =
    express.Router();


router.get(
    "/transactions",
    requireAuth,
    showTransactions
);


router.get(
    "/transactions/:id",
    requireAuth,
    showTransactionDetails
);


export default router;