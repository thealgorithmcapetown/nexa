
import bcrypt from "bcrypt";

import User from "../models/User.js";
import Shop from "../models/Shop.js";

const renderError = (res, statusCode, message) => {

    return res.status(statusCode).render("public/error", {
        statusCode,
        message
    });

};

const normalizeWalletAddress = (walletAddress) => {

    const value = String(walletAddress || "").trim();

    if (!value) {
        return "";
    }

    if (value.startsWith("$")) {
        return `https://${value.slice(1)}`;
    }

    return value;

};

const formatWalletAddress = (walletAddress) => {

    const value = String(walletAddress || "").trim();

    if (value.startsWith("$")) {
        return value;
    }

    const url = new URL(value);

    if (url.protocol === "https:") {
        return `$${url.host}${url.pathname}${url.search}`;
    }

    return value;

};

const validWalletAddress = (walletAddress) => {

    try {

        const normalized = normalizeWalletAddress(walletAddress);
        const url = new URL(normalized);

        return (
            url.protocol === "https:" &&
            Boolean(url.hostname) &&
            !url.username &&
            !url.password &&
            !url.hash &&
            !/\s/.test(walletAddress)
        );

    } catch (error) {

        return false;

    }

};

export const showSignup = (req, res) => {

    res.render("auth/signup");

};

export const showLogin = (req, res) => {

    res.render("auth/login");

};

export const signup = async (req, res) => {

    try {

        const {
            name,
            email,
            phone,
            password,
            shopName,
            category,
            address,
            location,
            walletAddress,
            latitude,
            longitude
        } = req.body;

        const requiredFields = [
            name,
            email,
            phone,
            password,
            shopName,
            category,
            address,
            location
        ];

        if (requiredFields.some((field) => !field || !String(field).trim())) {

            return renderError(
                res,
                400,
                "Please complete all required fields"
            );

        }

        if (password.length < 8) {

            return renderError(
                res,
                400,
                "Password must be at least 8 characters"
            );

        }

        if (
            latitude == null ||
            longitude == null ||
            String(latitude).trim() === "" ||
            String(longitude).trim() === ""
        ) {

            return renderError(
                res,
                400,
                "Please confirm your shop location on the map"
            );

        }

        const shopLatitude = Number(latitude);
        const shopLongitude = Number(longitude);

        if (
            !Number.isFinite(shopLatitude) ||
            !Number.isFinite(shopLongitude) ||
            shopLatitude < -90 ||
            shopLatitude > 90 ||
            shopLongitude < -180 ||
            shopLongitude > 180
        ) {

            return renderError(
                res,
                400,
                "Invalid shop coordinates"
            );

        }

        const cleanEmail = String(email).trim().toLowerCase();

        const existingUser = await User.findOne({
            email: cleanEmail
        });

        if (existingUser) {

            return renderError(
                res,
                400,
                "User already exists"
            );

        }

        let cleanWalletAddress = "";

        if (walletAddress && String(walletAddress).trim()) {

            const providedWalletAddress = String(walletAddress).trim();

            if (!validWalletAddress(providedWalletAddress)) {

                return renderError(
                    res,
                    400,
                    "Enter a valid Open Payments wallet address, starting with $"
                );

            }

            cleanWalletAddress = formatWalletAddress(
                providedWalletAddress
            );

        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            name: String(name).trim(),
            email: cleanEmail,
            phone: String(phone).trim(),
            password: hashedPassword
        });

        let shop;

        try {

            shop = await Shop.create({
                name: String(shopName).trim(),
                owner: user._id,
                category: String(category).trim(),
                address: `${String(address).trim()}, ${String(location).trim()}`,

                coordinates: {
                    latitude: shopLatitude,
                    longitude: shopLongitude
                },

                walletAddress: cleanWalletAddress
            });

            user.shop = shop._id;

            await user.save();

        } catch (error) {

            if (shop) {

                await Shop.findByIdAndDelete(shop._id).catch(console.error);

            }

            await User.findByIdAndDelete(user._id).catch(console.error);

            throw error;

        }

        req.session.userId = user._id;
        req.session.shopId = shop._id;

        req.session.save((error) => {

            if (error) {

                console.error("SIGNUP SESSION ERROR:", error);

                return renderError(
                    res,
                    500,
                    "Account created, but the session could not be started. Please log in."
                );

            }

            return res.render("auth/welcome");

        });

    } catch (error) {

        console.error(error);

        return renderError(
            res,
            500,
            "Signup failed. Please try again."
        );

    }

};

export const login = async (req, res) => {

    try {

        const {
            email,
            password
        } = req.body;

        const user = await User.findOne({
            email: String(email || "").trim().toLowerCase()
        });

        if (!user) {

            return renderError(
                res,
                400,
                "Invalid email or password"
            );

        }

        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatch) {

            return renderError(
                res,
                400,
                "Invalid email or password"
            );

        }

        req.session.userId = user._id;
        req.session.shopId = user.shop;

        res.redirect("/dashboard");

    } catch (error) {

        console.error(error);

        return renderError(
            res,
            500,
            "Login failed. Please try again."
        );

    }

};

export const logout = (req, res) => {

    req.session.destroy((error) => {

        if (error) {

            console.error(error);

            return renderError(
                res,
                500,
                "Logout failed. Please try again."
            );

        }

        res.redirect("/login");

    });

};
