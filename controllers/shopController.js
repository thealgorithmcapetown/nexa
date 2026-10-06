import Shop from "../models/Shop.js";
import User from "../models/User.js";
import bcrypt from "bcrypt";

// ========================================
// SHOW SHOP PROFILE
// ========================================

export const showShop = async (req, res) => {

    try {

        const shop =
            await Shop.findById(
                req.session.shopId
            );


        if (!shop) {

            return res.status(404).send(
                "Shop not found"
            );

        }


        return res.render(
            "shop/profile",
            {
                shop
            }
        );


    } catch (error) {

        console.error(
            "SHOW SHOP ERROR:",
            error
        );


        return res.status(500).send(
            "Unable to load shop"
        );

    }

};


// ========================================
// SHOW EDIT SHOP PAGE
// ========================================

export const showEditShop = async (req, res) => {

    try {

        const shop =
            await Shop.findById(
                req.session.shopId
            );


        if (!shop) {

            return res.status(404).send(
                "Shop not found"
            );

        }


        return res.render(
            "shop/edit",
            {
                shop
            }
        );


    } catch (error) {

        console.error(
            "SHOW EDIT SHOP ERROR:",
            error
        );


        return res.status(500).send(
            "Unable to load edit shop page"
        );

    }

};


// ========================================
// UPDATE SHOP
// ========================================

export const updateShop = async (req, res) => {

    try {

        const shop =
            await Shop.findById(
                req.session.shopId
            );


        if (!shop) {

            return res.status(404).send(
                "Shop not found"
            );

        }


        const {
            name,
            category,
            description,
            address,
            walletAddress
        } = req.body;


        // ========================================
        // VALIDATION
        // ========================================

        if (
            !name ||
            name.trim() === ""
        ) {

            return res.status(400).send(
                "Shop name is required"
            );

        }


        if (
            !address ||
            address.trim() === ""
        ) {

            return res.status(400).send(
                "Shop address is required"
            );

        }


        // ========================================
        // UPDATE ALLOWED FIELDS ONLY
        // ========================================

        shop.name =
            name.trim();


        shop.category =
            category
                ? category.trim()
                : "";


        shop.description =
            description
                ? description.trim()
                : "";


        shop.address =
            address.trim();


        shop.walletAddress =
            walletAddress
                ? walletAddress.trim()
                : "";


        await shop.save();


        console.log(
            "SHOP UPDATED:",
            shop._id
        );


        return res.redirect(
            "/shop"
        );


    } catch (error) {

        console.error(
            "UPDATE SHOP ERROR:",
            error
        );


        return res.status(500).send(
            "Unable to update shop"
        );

    }

};
// ========================================
// SHOW SETTINGS
// ========================================

export const showSettings = async (req, res) => {

    try {

        const user =
            await User.findById(
                req.session.userId
            );


        if (!user) {

            return res.status(404).send(
                "User not found"
            );

        }


        return res.render(
            "shop/settings",
            {
                user
            }
        );


    } catch (error) {

        console.error(
            "SHOW SETTINGS ERROR:",
            error
        );


        return res.status(500).send(
            "Unable to load settings"
        );

    }

};


// ========================================
// UPDATE SETTINGS
// ========================================

export const updateSettings = async (req, res) => {

    try {

        const user =
            await User.findById(
                req.session.userId
            );


        if (!user) {

            return res.status(404).send(
                "User not found"
            );

        }


        const {
            name,
            email,
            phone
        } = req.body;


        if (
            !name ||
            name.trim() === ""
        ) {

            return res.status(400).send(
                "Name is required"
            );

        }


        if (
            !email ||
            email.trim() === ""
        ) {

            return res.status(400).send(
                "Email is required"
            );

        }


        // Make sure another account
        // is not already using this email

        const existingUser =
            await User.findOne({

                email:
                    email
                        .trim()
                        .toLowerCase(),

                _id: {
                    $ne: user._id
                }

            });


        if (existingUser) {

            return res.status(400).send(
                "That email is already in use"
            );

        }


        user.name =
            name.trim();


        user.email =
            email
                .trim()
                .toLowerCase();


        user.phone =
            phone
                ? phone.trim()
                : "";


        await user.save();


        console.log(
            "ACCOUNT SETTINGS UPDATED:",
            user._id
        );


        return res.redirect(
            "/settings"
        );


    } catch (error) {

        console.error(
            "UPDATE SETTINGS ERROR:",
            error
        );


        return res.status(500).send(
            "Unable to update settings"
        );

    }

};
// ========================================
// CHANGE PASSWORD
// ========================================

export const changePassword = async (req, res) => {

    try {

        const user =
            await User.findById(
                req.session.userId
            );


        if (!user) {

            return res.status(404).send(
                "User not found"
            );

        }


        const {
            currentPassword,
            newPassword,
            confirmPassword
        } = req.body;


        // ========================================
        // REQUIRED FIELDS
        // ========================================

        if (
            !currentPassword ||
            !newPassword ||
            !confirmPassword
        ) {

            return res.status(400).send(
                "All password fields are required"
            );

        }


        // ========================================
        // VERIFY CURRENT PASSWORD
        // ========================================

        const passwordMatches =
            await bcrypt.compare(
                currentPassword,
                user.password
            );


        if (!passwordMatches) {

            return res.status(400).send(
                "Current password is incorrect"
            );

        }


        // ========================================
        // VALIDATE NEW PASSWORD
        // ========================================

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


        // Don't allow same password again

        const sameAsCurrentPassword =
            await bcrypt.compare(
                newPassword,
                user.password
            );


        if (sameAsCurrentPassword) {

            return res.status(400).send(
                "New password must be different from your current password"
            );

        }


        // ========================================
        // HASH NEW PASSWORD
        // ========================================

        const hashedPassword =
            await bcrypt.hash(
                newPassword,
                12
            );


        user.password =
            hashedPassword;


        await user.save();


        console.log(
            "PASSWORD CHANGED:",
            user._id
        );


        // ========================================
        // DESTROY LOGIN SESSION
        // ========================================

        req.session.destroy((error) => {

            if (error) {

                console.error(
                    "SESSION DESTROY ERROR:",
                    error
                );


                return res.status(500).send(
                    "Password changed, but the session could not be closed"
                );

            }


            return res.redirect(
                "/login"
            );

        });


    } catch (error) {

        console.error(
            "CHANGE PASSWORD ERROR:",
            error
        );


        return res.status(500).send(
            "Unable to change password"
        );

    }

};