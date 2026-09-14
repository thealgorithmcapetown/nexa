import express from "express";

import { requireAuth } from "../middleware/authMiddleware.js";

import { showDashboard } from "../controllers/dashboardController.js";

const router = express.Router();

router.get(
    "/dashboard",
    requireAuth,
    showDashboard
);

export default router;