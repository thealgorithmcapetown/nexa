
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
    changePassword,
    updateWallet,
    removeWallet
} from "../controllers/shopController.js";

const router = express.Router();


router.get(
    "/shop",
    requireAuth,
    showShop
);



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


router.post(
    "/settings/password",
    requireAuth,
    changePassword
);


router.post(
    "/settings/wallet",
    requireAuth,
    updateWallet
);

router.post(
    "/settings/wallet/remove",
    requireAuth,
    removeWallet
);


export default router;
