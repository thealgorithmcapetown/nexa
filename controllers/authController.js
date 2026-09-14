import bcrypt from "bcrypt";

import User from "../models/User.js";
import Shop from "../models/Shop.js";



// SHOW SIGNUP


export const showSignup = (req, res) => {
    res.render("auth/signup");
};



// SHOW LOGIN


export const showLogin = (req, res) => {
    res.render("auth/login");
};



// SIGNUP


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
            location
        } = req.body;


        // Check if user already exists

        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(400).send("User already exists");
        }


        // Hash password

        const hashedPassword = await bcrypt.hash(password, 10);


        // Create user

        const user = await User.create({
            name,
            email,
            phone,
            password: hashedPassword
        });


        // Create shop

        const shop = await Shop.create({
            name: shopName,
            owner: user._id,
            category,
            address,
            location
        });


        // Connect shop to user

        user.shop = shop._id;

        await user.save();


        // Create session

        req.session.userId = user._id;

        req.session.shopId = shop._id;


        res.redirect("/dashboard");

    } catch (error) {

        console.error(error);

        res.status(500).send("Signup failed");
    }
};



// LOGIN


export const login = async (req, res) => {

    try {

        const {
            email,
            password
        } = req.body;


        // Find user

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).send("Invalid email or password");
        }


        // Compare password

        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatch) {
            return res.status(400).send("Invalid email or password");
        }


        // Create session

        req.session.userId = user._id;
        req.session.shopId = user.shop;


        res.redirect("/dashboard");

    } catch (error) {

        console.error(error);

        res.status(500).send("Login failed");
    }
};



//LOGOUT


export const logout = (req, res) => {

    req.session.destroy((error) => {

        if (error) {
            console.error(error);

            return res.status(500).send("Logout failed");
        }

        res.redirect("/login");
    });
};