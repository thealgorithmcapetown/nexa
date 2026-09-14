import User from "../models/User.js";
import Shop from "../models/Shop.js";

export const showDashboard = async (req, res) => {

    try {

        const user = await User.findById(req.session.userId);

        if (!user) {
            return res.redirect("/login");
        }

        const shop = await Shop.findById(user.shop);

        res.render("dashboard/dashboard", {
            user,
            shop
        });

    } catch (error) {

        console.error(error);

        res.status(500).send("Unable to load dashboard");

    }

};