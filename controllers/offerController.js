import Offer from "../models/Offer.js";
import TradeRequest from "../models/TradeRequest.js";
import Shop from "../models/Shop.js";
import Notification from "../models/Notification.js";

export const showOfferForm = async (req, res) => {

    try {

        const tradeRequest = await TradeRequest
            .findById(req.params.id)
            .populate("shop");

        if (!tradeRequest) {
            return res.status(404).send("Trade request not found");
        }


        // Stop user from making an offer on their own request

        if (
            tradeRequest.shop._id.toString() ===
            req.session.shopId.toString()
        ) {
            return res.status(403).send(
                "You cannot make an offer on your own request"
            );
        }


        res.render("offers/create", {
            tradeRequest
        });

    } catch (error) {

        console.error(error);

        res.status(500).send("Unable to load offer form");

    }

};

export const createOffer = async (req, res) => {

    try {

        const {
            amount,
            quantity,
            delivery,
            message
        } = req.body;


        const tradeRequest = await TradeRequest.findById(
            req.params.id
        );


        if (!tradeRequest) {

            return res.status(404).send(
                "Trade request not found"
            );

        }


        if (tradeRequest.status !== "open") {

            return res.status(400).send(
                "This trade request is no longer open"
            );

        }


        const sellerShop = await Shop.findById(
            req.session.shopId
        );


        if (!sellerShop) {

            return res.status(404).send(
                "Seller shop not found"
            );

        }


        if (
            tradeRequest.shop.toString() ===
            sellerShop._id.toString()
        ) {

            return res.status(403).send(
                "You cannot make an offer on your own request"
            );

        }


        const offer = await Offer.create({

            tradeRequest: tradeRequest._id,

            seller: sellerShop._id,

            buyer: tradeRequest.shop,

            amount,

            quantity,

            delivery: delivery === "on",

            message

        });


        const buyerShop = await Shop.findById(
            tradeRequest.shop
        );


        if (buyerShop?.owner) {

            await Notification.create({

                user: buyerShop.owner,

                type: "new_offer",

                message:
                    `${sellerShop.name} made an offer on ${tradeRequest.product}`,

                relatedTrade: tradeRequest._id,

                relatedOffer: offer._id

            });

        }


        return res.redirect("/offers");


    } catch (error) {

        console.error(
            "CREATE OFFER ERROR:",
            error
        );

        return res.status(500).send(
            "Unable to create offer"
        );

    }

};

export const showOffers = async (req, res) => {

    try {

        const shopId = req.session.shopId;


        const receivedOffers = await Offer
            .find({
                buyer: shopId
            })
            .populate("seller")
            .populate("tradeRequest")
            .sort({
                createdAt: -1
            });


        const sentOffers = await Offer
            .find({
                seller: shopId
            })
            .populate("buyer")
            .populate("tradeRequest")
            .sort({
                createdAt: -1
            });


        res.render("offers/index", {
            receivedOffers,
            sentOffers
        });


    } catch (error) {

        console.error(error);

        res.status(500).send("Unable to load offers");

    }

};
export const showOfferDetails = async (req, res) => {

    try {

        const offer = await Offer
            .findById(req.params.id)
            .populate("seller")
            .populate("buyer")
            .populate("tradeRequest");

        if (!offer) {
            return res.status(404).send("Offer not found");
        }


        const currentShopId = req.session.shopId.toString();

        const isBuyer =
            offer.buyer._id.toString() === currentShopId;

        const isSeller =
            offer.seller._id.toString() === currentShopId;


        if (!isBuyer && !isSeller) {
            return res.status(403).send("Not authorized");
        }


        res.render("offers/details", {
            offer,
            isBuyer,
            isSeller
        });

    } catch (error) {

        console.error(error);

        res.status(500).send("Unable to load offer");

    }

};
export const acceptOffer = async (req, res) => {

    try {

        const offer = await Offer.findById(req.params.id);

        if (!offer) {
            return res.status(404).send("Offer not found");
        }


        // Only the buyer/request owner can accept

        if (
            offer.buyer.toString() !==
            req.session.shopId.toString()
        ) {
            return res.status(403).send(
                "You are not authorized to accept this offer"
            );
        }


        if (offer.status !== "pending") {
            return res.status(400).send(
                "This offer is no longer pending"
            );
        }


        const tradeRequest = await TradeRequest.findById(
            offer.tradeRequest
        );


        if (!tradeRequest) {
            return res.status(404).send(
                "Trade request not found"
            );
        }


        if (tradeRequest.status !== "open") {
            return res.status(400).send(
                "This trade request is no longer open"
            );
        }


        // Accept chosen offer

        offer.status = "accepted";

        await offer.save();


        // Close trade request

        tradeRequest.status = "accepted";

        await tradeRequest.save();


        // Decline all other pending offers

        await Offer.updateMany(
            {
                tradeRequest: tradeRequest._id,
                _id: { $ne: offer._id },
                status: "pending"
            },
            {
                $set: {
                    status: "declined"
                }
            }
        );
        const sellerShop = await Shop.findById(offer.seller);

        if (sellerShop?.owner) {

            await Notification.create({

                user: sellerShop.owner,

                type: "offer_accepted",

                message:
                    `Your offer for ${tradeRequest.product} was accepted`,

                relatedTrade: tradeRequest._id,

                relatedOffer: offer._id

            });

        }



        res.redirect(`/offers/${offer._id}`);

    } catch (error) {

        console.error(error);

        res.status(500).send("Unable to accept offer");

    }

};
export const declineOffer = async (req, res) => {

    try {

        const offer = await Offer.findById(req.params.id);

        if (!offer) {
            return res.status(404).send("Offer not found");
        }


        if (
            offer.buyer.toString() !==
            req.session.shopId.toString()
        ) {
            return res.status(403).send(
                "You are not authorized to decline this offer"
            );
        }


        if (offer.status !== "pending") {
            return res.status(400).send(
                "This offer is no longer pending"
            );
        }


        offer.status = "declined";

        await offer.save();
        const sellerShop = await Shop.findById(offer.seller);

        const tradeRequest = await TradeRequest.findById(
            offer.tradeRequest
        );

        if (sellerShop?.owner && tradeRequest) {

            await Notification.create({

                user: sellerShop.owner,

                type: "offer_declined",

                message:
                    `Your offer for ${tradeRequest.product} was declined`,

                relatedTrade: tradeRequest._id,

                relatedOffer: offer._id

            });

        }


        res.redirect(`/offers/${offer._id}`);

    } catch (error) {

        console.error(error);

        res.status(500).send("Unable to decline offer");

    }

};