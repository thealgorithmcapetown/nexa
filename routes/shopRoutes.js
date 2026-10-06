import express from "express";

import {
    requireAuth
} from "../middleware/authMiddleware.js";

import {
    showShop,
    showEditShop,
    updateShop,
    showSettings,
    updateSettings,
    changePassword
} from "../controllers/shopController.js";

const router =
    express.Router();


// ========================================
// SHOP PROFILE
// ========================================

router.get(
    "/shop",
    requireAuth,
    showShop
);


// ========================================
// EDIT SHOP
// ========================================

router.get(
    "/shop/edit",
    requireAuth,
    showEditShop
);


router.post(
    "/shop/edit",
    requireAuth,
    updateShop
);


// ========================================
// SETTINGS
// ========================================

router.get(
    "/settings",
    requireAuth,
    showSettings
);


router.post(
    "/settings",
    requireAuth,
    updateSettings
);


// ========================================
// CHANGE PASSWORD
// ========================================

router.post(
    "/settings/password",
    requireAuth,
    changePassword
);


export default router;