import Shop from "../models/Shop.js";

export const showShop = async (req, res) => {

    try {

        const shop = await Shop.findById(req.session.shopId);

        if (!shop) {
            return res.status(404).send("Shop not found");
        }

        res.render("shop/profile", {
            shop
        });

    } catch (error) {

        console.error(error);

        res.status(500).send("Unable to load shop");

    }

};