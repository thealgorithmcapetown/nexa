
import Shop from "../models/Shop.js";
import User from "../models/User.js";
import bcrypt from "bcrypt";

export const showShop = async (req, res) => {
    try {
        const shop = await Shop.findOne({
            _id: req.session.shopId,
            owner: req.session.userId
        });

        if (!shop) {
            return res.status(404).send("Shop not found");
        }

        return res.render("shop/profile", {
            shop
        });

    } catch (error) {
        console.error("SHOW SHOP ERROR:", error);
        return res.status(500).send("Unable to load shop");
    }
};

export const showEditShop = async (req, res) => {
    try {
        const shop = await Shop.findOne({
            _id: req.session.shopId,
            owner: req.session.userId
        });

        if (!shop) {
            return res.status(404).send("Shop not found");
        }

        return res.render("shop/edit", {
            shop
        });

    } catch (error) {
        console.error("SHOW EDIT SHOP ERROR:", error);
        return res.status(500).send("Unable to load edit shop page");
    }
};

export const updateShop = async (req, res) => {
    try {
        const shop = await Shop.findOne({
            _id: req.session.shopId,
            owner: req.session.userId
        });

        if (!shop) {
            return res.status(404).send("Shop not found");
        }

        const {
            name,
            category,
            description,
            address,
            walletAddress,
            latitude,
            longitude,
            locationConfirmed
        } = req.body;

        if (typeof name !== "string" || !name.trim()) {
            return res.status(400).send("Shop name is required");
        }

        if (typeof address !== "string" || !address.trim()) {
            return res.status(400).send("Shop address is required");
        }

        if (locationConfirmed !== "true") {
            return res.status(400).send(
                "Please confirm your shop location on the map"
            );
        }

        if (
            typeof latitude !== "string" ||
            typeof longitude !== "string" ||
            !latitude.trim() ||
            !longitude.trim()
        ) {
            return res.status(400).send(
                "Shop map coordinates are required"
            );
        }

        const cleanLatitude = Number(latitude);
        const cleanLongitude = Number(longitude);

        if (
            !Number.isFinite(cleanLatitude) ||
            !Number.isFinite(cleanLongitude) ||
            cleanLatitude < -90 ||
            cleanLatitude > 90 ||
            cleanLongitude < -180 ||
            cleanLongitude > 180
        ) {
            return res.status(400).send(
                "Invalid shop map coordinates"
            );
        }

        let cleanWalletAddress = "";

        if (walletAddress && String(walletAddress).trim()) {
            cleanWalletAddress = String(walletAddress).trim();

            try {
                const walletUrl = new URL(cleanWalletAddress);

                if (walletUrl.protocol !== "https:") {
                    return res.status(400).send(
                        "Wallet address must use HTTPS"
                    );
                }

                if (walletUrl.username || walletUrl.password) {
                    return res.status(400).send(
                        "Wallet address cannot contain login credentials"
                    );
                }

            } catch (error) {
                return res.status(400).send(
                    "Invalid wallet address"
                );
            }
        }

        shop.name = name.trim();

        shop.category = typeof category === "string"
            ? category.trim()
            : "";

        shop.description = typeof description === "string"
            ? description.trim()
            : "";

        shop.address = address.trim();
        shop.walletAddress = cleanWalletAddress;

        shop.coordinates = {
            latitude: cleanLatitude,
            longitude: cleanLongitude
        };

        await shop.save();

        console.log("SHOP UPDATED:", shop._id);
        console.log("SHOP COORDINATES SAVED:", shop.coordinates);

        return res.redirect("/shop");

    } catch (error) {
        console.error("UPDATE SHOP ERROR:", error);
        return res.status(500).send("Unable to update shop");
    }
};

export const showSettings = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);

        if (!user) {
            return res.status(404).send("User not found");
        }

        const shop = await Shop.findOne({
            _id: req.session.shopId,
            owner: user._id
        });

        if (!shop) {
            return res.status(404).send("Shop not found");
        }

        return res.render("shop/settings", {
            user,
            shop
        });

    } catch (error) {
        console.error("SHOW SETTINGS ERROR:", error);
        return res.status(500).send("Unable to load settings");
    }
};

export const updateSettings = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);

        if (!user) {
            return res.status(404).send("User not found");
        }

        const {
            name,
            email,
            phone
        } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).send("Name is required");
        }

        if (!email || !email.trim()) {
            return res.status(400).send("Email is required");
        }

        const existingUser = await User.findOne({
            email: email.trim().toLowerCase(),
            _id: {
                $ne: user._id
            }
        });

        if (existingUser) {
            return res.status(400).send(
                "That email is already in use"
            );
        }

        user.name = name.trim();
        user.email = email.trim().toLowerCase();

        user.phone = phone
            ? phone.trim()
            : "";

        await user.save();

        console.log("ACCOUNT SETTINGS UPDATED:", user._id);

        return res.redirect("/settings");

    } catch (error) {
        console.error("UPDATE SETTINGS ERROR:", error);
        return res.status(500).send("Unable to update settings");
    }
};

export const changePassword = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);

        if (!user) {
            return res.status(404).send("User not found");
        }

        const {
            currentPassword,
            newPassword,
            confirmPassword
        } = req.body;

        if (
            !currentPassword ||
            !newPassword ||
            !confirmPassword
        ) {
            return res.status(400).send(
                "All password fields are required"
            );
        }

        const passwordMatches = await bcrypt.compare(
            currentPassword,
            user.password
        );

        if (!passwordMatches) {
            return res.status(400).send(
                "Current password is incorrect"
            );
        }

        if (newPassword.length < 8) {
            return res.status(400).send(
                "New password must be at least 8 characters"
            );
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).send(
                "New passwords do not match"
            );
        }

        const sameAsCurrentPassword = await bcrypt.compare(
            newPassword,
            user.password
        );

        if (sameAsCurrentPassword) {
            return res.status(400).send(
                "New password must be different from your current password"
            );
        }

        const hashedPassword = await bcrypt.hash(
            newPassword,
            12
        );

        user.password = hashedPassword;

        await user.save();

        console.log("PASSWORD CHANGED:", user._id);

        req.session.destroy((error) => {
            if (error) {
                console.error("SESSION DESTROY ERROR:", error);

                return res.status(500).send(
                    "Password changed, but the session could not be closed"
                );
            }

            return res.redirect("/login");
        });

    } catch (error) {
        console.error("CHANGE PASSWORD ERROR:", error);
        return res.status(500).send("Unable to change password");
    }
};

export const updateWallet = async (req, res) => {
    try {
        const shop = await Shop.findOne({
            _id: req.session.shopId,
            owner: req.session.userId
        });

        if (!shop) {
            return res.status(404).send("Shop not found");
        }

        const walletAddress = req.body.walletAddress;

        if (
            typeof walletAddress !== "string" ||
            !walletAddress.trim()
        ) {
            return res.status(400).send(
                "Please enter a wallet address"
            );
        }

        const cleanWalletAddress = walletAddress.trim();

        try {
            const walletUrl = new URL(cleanWalletAddress);

            if (walletUrl.protocol !== "https:") {
                return res.status(400).send(
                    "Wallet address must use HTTPS"
                );
            }

            if (walletUrl.username || walletUrl.password) {
                return res.status(400).send(
                    "Wallet address cannot contain login credentials"
                );
            }

        } catch (error) {
            return res.status(400).send(
                "Invalid wallet address"
            );
        }

        shop.walletAddress = cleanWalletAddress;

        await shop.save();

        console.log("WALLET UPDATED:", shop._id);

        return res.redirect("/settings");

    } catch (error) {
        console.error("UPDATE WALLET ERROR:", error);
        return res.status(500).send("Unable to update wallet");
    }
};

export const removeWallet = async (req, res) => {
    try {
        const shop = await Shop.findOne({
            _id: req.session.shopId,
            owner: req.session.userId
        });

        if (!shop) {
            return res.status(404).send("Shop not found");
        }

        shop.walletAddress = "";

        await shop.save();

        console.log("WALLET REMOVED:", shop._id);

        return res.redirect("/settings");

    } catch (error) {
        console.error("REMOVE WALLET ERROR:", error);
        return res.status(500).send("Unable to remove wallet");
    }
};
