import express from "express";

import { requireAuth } from "../middleware/authMiddleware.js";

import { showShop } from "../controllers/shopController.js";

const router = express.Router();

router.get(
    "/shop",
    requireAuth,
    showShop
);

export default router;