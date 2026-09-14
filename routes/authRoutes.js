import express from "express";

import {
    showSignup,
    showLogin,
    signup,
    login,
    logout
} from "../controllers/authController.js";

const router = express.Router();


// Show signup page
router.get("/signup", showSignup);


// Process signup
router.post("/signup", signup);


// Show login page
router.get("/login", showLogin);


// Process login
router.post("/login", login);


// Logout
router.get("/logout", logout);


export default router;