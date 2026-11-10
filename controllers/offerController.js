import mongoose from "mongoose";

import Offer from "../models/Offer.js";
import TradeRequest from "../models/TradeRequest.js";
import Shop from "../models/Shop.js";
import Notification from "../models/Notification.js";


export const showOfferForm = async (req, res) => {

    try {

        if (
            !mongoose.Types.ObjectId.isValid(
                req.params.id
            )
        ) {

            return res.status(400).send(
                "Invalid trade request"
            );

        }


        const tradeRequest =
            await TradeRequest
                .findById(
                    req.params.id
                )
                .populate("shop");


        if (!tradeRequest) {

            return res.status(404).send(
                "Trade request not found"
            );

        }


        if (!tradeRequest.shop) {

            return res.status(404).send(
                "Trade shop not found"
            );

        }


        if (
            tradeRequest.status !==
            "open"
        ) {

            return res.status(400).send(
                "This trade request is no longer open"
            );

        }


        if (
            tradeRequest.shop._id.toString() ===
            req.session.shopId.toString()
        ) {

            return res.status(403).send(
                "You cannot make an offer on your own request"
            );

        }


        return res.render(
            "offers/create",
            {
                tradeRequest
            }
        );


    } catch (error) {

        console.error(
            "SHOW OFFER FORM ERROR:",
            error.message
        );


        return res.status(500).send(
            "Unable to load offer form"
        );

    }

};


export const createOffer = async (req, res) => {

    try {

        if (
            !mongoose.Types.ObjectId.isValid(
                req.params.id
            )
        ) {

            return res.status(400).send(
                "Invalid trade request"
            );

        }


        const {
            amount,
            quantity,
            delivery,
            message
        } = req.body;


        const parsedAmount =
            Number(amount);

        const parsedQuantity =
            Number(quantity);


        if (
            !Number.isFinite(parsedAmount) ||
            parsedAmount <= 0
        ) {

            return res.status(400).send(
                "Offer amount must be greater than 0"
            );

        }


        if (
            !Number.isFinite(parsedQuantity) ||
            parsedQuantity <= 0
        ) {

            return res.status(400).send(
                "Offer quantity must be greater than 0"
            );

        }


        const tradeRequest =
            await TradeRequest.findById(
                req.params.id
            );


        if (!tradeRequest) {

            return res.status(404).send(
                "Trade request not found"
            );

        }


        if (
            tradeRequest.status !==
            "open"
        ) {

            return res.status(400).send(
                "This trade request is no longer open"
            );

        }


        const sellerShop =
            await Shop.findById(
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


        const existingPendingOffer =
            await Offer.findOne({

                tradeRequest:
                    tradeRequest._id,

                seller:
                    sellerShop._id,

                status:
                    "pending"

            });


        if (existingPendingOffer) {

            return res.redirect(
                `/offers/${existingPendingOffer._id}`
            );

        }


        const offer =
            await Offer.create({

                tradeRequest:
                    tradeRequest._id,

                seller:
                    sellerShop._id,

                buyer:
                    tradeRequest.shop,

                amount:
                    parsedAmount,

                quantity:
                    parsedQuantity,

                delivery:
                    delivery === "on" ||
                    delivery === "true",

                message:
                    message
                        ? message.trim()
                        : ""

            });


        const buyerShop =
            await Shop.findById(
                tradeRequest.shop
            );


        if (buyerShop?.owner) {

            const existingNotification =
                await Notification.findOne({

                    user:
                        buyerShop.owner,

                    type:
                        "new_offer",

                    relatedOffer:
                        offer._id

                });


            if (!existingNotification) {

                await Notification.create({

                    user:
                        buyerShop.owner,

                    type:
                        "new_offer",

                    message:
                        `${sellerShop.name} made an offer on ${tradeRequest.product}`,

                    relatedTrade:
                        tradeRequest._id,

                    relatedOffer:
                        offer._id,

                    relatedShop:
                        sellerShop._id

                });

            }

        }


        return res.redirect(
            `/offers/${offer._id}`
        );


    } catch (error) {

        console.error(
            "CREATE OFFER ERROR:",
            error.message
        );


        return res.status(500).send(
            "Unable to create offer"
        );

    }

};


export const showOffers = async (req, res) => {

    try {

        const shopId =
            req.session.shopId;


        const receivedOffers =
            await Offer
                .find({
                    buyer:
                        shopId
                })
                .populate("seller")
                .populate("tradeRequest")
                .sort({
                    createdAt: -1
                });


        const sentOffers =
            await Offer
                .find({
                    seller:
                        shopId
                })
                .populate("buyer")
                .populate("tradeRequest")
                .sort({
                    createdAt: -1
                });


        return res.render(
            "offers/index",
            {
                receivedOffers,
                sentOffers
            }
        );


    } catch (error) {

        console.error(
            "SHOW OFFERS ERROR:",
            error.message
        );


        return res.status(500).send(
            "Unable to load offers"
        );

    }

};


export const showOfferDetails = async (req, res) => {

    try {

        if (
            !mongoose.Types.ObjectId.isValid(
                req.params.id
            )
        ) {

            return res.status(400).send(
                "Invalid offer"
            );

        }


        const offer =
            await Offer
                .findById(
                    req.params.id
                )
                .populate("seller")
                .populate("buyer")
                .populate("tradeRequest");


        if (!offer) {

            return res.status(404).send(
                "Offer not found"
            );

        }


        if (
            !offer.seller ||
            !offer.buyer ||
            !offer.tradeRequest
        ) {

            return res.status(404).send(
                "Offer data is incomplete"
            );

        }


        const currentShopId =
            req.session.shopId.toString();


        const isBuyer =
            offer.buyer._id
                .toString() ===
            currentShopId;


        const isSeller =
            offer.seller._id
                .toString() ===
            currentShopId;


        if (
            !isBuyer &&
            !isSeller
        ) {

            return res.status(403).send(
                "Not authorized"
            );

        }


        return res.render(
            "offers/details",
            {
                offer,
                isBuyer,
                isSeller
            }
        );


    } catch (error) {

        console.error(
            "SHOW OFFER DETAILS ERROR:",
            error.message
        );


        return res.status(500).send(
            "Unable to load offer"
        );

    }

};


export const acceptOffer = async (req, res) => {

    try {

        if (
            !mongoose.Types.ObjectId.isValid(
                req.params.id
            )
        ) {

            return res.status(400).send(
                "Invalid offer"
            );

        }


        const offer =
            await Offer.findById(
                req.params.id
            );


        if (!offer) {

            return res.status(404).send(
                "Offer not found"
            );

        }


        if (
            offer.buyer.toString() !==
            req.session.shopId.toString()
        ) {

            return res.status(403).send(
                "You are not authorized to accept this offer"
            );

        }


        if (
            offer.status ===
            "accepted"
        ) {

            return res.redirect(
                `/offers/${offer._id}`
            );

        }


        if (
            offer.status !==
            "pending"
        ) {

            return res.status(400).send(
                "This offer is no longer pending"
            );

        }


        const tradeRequest =
            await TradeRequest.findById(
                offer.tradeRequest
            );


        if (!tradeRequest) {

            return res.status(404).send(
                "Trade request not found"
            );

        }


        if (
            tradeRequest.shop.toString() !==
            offer.buyer.toString()
        ) {

            return res.status(400).send(
                "Offer does not match trade owner"
            );

        }


        if (
            tradeRequest.status !==
            "open"
        ) {

            return res.status(400).send(
                "This trade request is no longer open"
            );

        }


        const alreadyAcceptedOffer =
            await Offer.findOne({

                tradeRequest:
                    tradeRequest._id,

                status:
                    "accepted",

                _id: {
                    $ne:
                        offer._id
                }

            });


        if (alreadyAcceptedOffer) {

            return res.status(409).send(
                "Another offer has already been accepted for this trade"
            );

        }


        offer.status =
            "accepted";

        await offer.save();


        tradeRequest.status =
            "accepted";

        await tradeRequest.save();


        await Offer.updateMany(

            {
                tradeRequest:
                    tradeRequest._id,

                _id: {
                    $ne:
                        offer._id
                },

                status:
                    "pending"
            },

            {
                $set: {
                    status:
                        "declined"
                }
            }

        );


        const sellerShop =
            await Shop.findById(
                offer.seller
            );


        if (sellerShop?.owner) {

            const existingNotification =
                await Notification.findOne({

                    user:
                        sellerShop.owner,

                    type:
                        "offer_accepted",

                    relatedOffer:
                        offer._id

                });


            if (!existingNotification) {

                await Notification.create({

                    user:
                        sellerShop.owner,

                    type:
                        "offer_accepted",

                    message:
                        `Your offer for ${tradeRequest.product} was accepted`,

                    relatedTrade:
                        tradeRequest._id,

                    relatedOffer:
                        offer._id,

                    relatedShop:
                        offer.buyer

                });

            }

        }


        return res.redirect(
            `/offers/${offer._id}`
        );


    } catch (error) {

        console.error(
            "ACCEPT OFFER ERROR:",
            error.message
        );


        return res.status(500).send(
            "Unable to accept offer"
        );

    }

};


export const declineOffer = async (req, res) => {

    try {

        if (
            !mongoose.Types.ObjectId.isValid(
                req.params.id
            )
        ) {

            return res.status(400).send(
                "Invalid offer"
            );

        }


        const offer =
            await Offer.findById(
                req.params.id
            );


        if (!offer) {

            return res.status(404).send(
                "Offer not found"
            );

        }


        if (
            offer.buyer.toString() !==
            req.session.shopId.toString()
        ) {

            return res.status(403).send(
                "You are not authorized to decline this offer"
            );

        }


        if (
            offer.status ===
            "declined"
        ) {

            return res.redirect(
                `/offers/${offer._id}`
            );

        }


        if (
            offer.status !==
            "pending"
        ) {

            return res.status(400).send(
                "This offer is no longer pending"
            );

        }


        const tradeRequest =
            await TradeRequest.findById(
                offer.tradeRequest
            );


        if (!tradeRequest) {

            return res.status(404).send(
                "Trade request not found"
            );

        }


        if (
            tradeRequest.shop.toString() !==
            offer.buyer.toString()
        ) {

            return res.status(400).send(
                "Offer does not match trade owner"
            );

        }


        offer.status =
            "declined";

        await offer.save();


        const sellerShop =
            await Shop.findById(
                offer.seller
            );


        if (sellerShop?.owner) {

            const existingNotification =
                await Notification.findOne({

                    user:
                        sellerShop.owner,

                    type:
                        "offer_declined",

                    relatedOffer:
                        offer._id

                });


            if (!existingNotification) {

                await Notification.create({

                    user:
                        sellerShop.owner,

                    type:
                        "offer_declined",

                    message:
                        `Your offer for ${tradeRequest.product} was declined`,

                    relatedTrade:
                        tradeRequest._id,

                    relatedOffer:
                        offer._id,

                    relatedShop:
                        offer.buyer

                });

            }

        }


        return res.redirect(
            `/offers/${offer._id}`
        );


    } catch (error) {

        console.error(
            "DECLINE OFFER ERROR:",
            error.message
        );


        return res.status(500).send(
            "Unable to decline offer"
        );

    }

};


export const withdrawOffer = async (req, res) => {

    try {

        const offer =
            await Offer.findById(
                req.params.id
            );


        if (!offer) {

            return res.status(404).send(
                "Offer not found"
            );

        }


        if (
            offer.seller.toString() !==
            req.session.shopId.toString()
        ) {

            return res.status(403).send(
                "You cannot withdraw this offer"
            );

        }


        if (offer.status !== "pending") {

            return res.status(400).send(
                "Only pending offers can be withdrawn"
            );

        }


        offer.status = "withdrawn";

        await offer.save();


        console.log(
            "OFFER WITHDRAWN:",
            offer._id
        );


        return res.redirect(
            "/offers"
        );


    } catch (error) {

        console.error(
            "WITHDRAW OFFER ERROR:",
            error
        );


        return res.status(500).send(
            "Unable to withdraw offer"
        );

    }

};