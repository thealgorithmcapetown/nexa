import mongoose from "mongoose";

import TradeRequest from "../models/TradeRequest.js";
import Shop from "../models/Shop.js";
import Offer from "../models/Offer.js";
import Payment from "../models/Payment.js";
import Notification from "../models/Notification.js";

import {
    calculateDistance
} from "../utils/calculateDistance.js";


// ========================================
// SHOW TRADE BOARD
// ========================================

export const showTradeBoard = async (req, res) => {

    try {

        const currentShop =
            await Shop.findById(
                req.session.shopId
            );


        if (!currentShop) {

            return res.status(404).send(
                "Shop not found"
            );

        }


        const requests =
            await TradeRequest
                .find({
                    status: "open",

                    shop: {
                        $ne: currentShop._id
                    }
                })
                .populate("shop")
                .sort({
                    createdAt: -1
                });


        const requestsWithDistance =
            requests.map(request => {

                let distance = null;


                const currentCoordinates =
                    currentShop.coordinates;

                const requestCoordinates =
                    request.coordinates;


                if (
                    currentCoordinates?.latitude != null &&
                    currentCoordinates?.longitude != null &&
                    requestCoordinates?.latitude != null &&
                    requestCoordinates?.longitude != null
                ) {

                    distance =
                        calculateDistance(

                            currentCoordinates.latitude,

                            currentCoordinates.longitude,

                            requestCoordinates.latitude,

                            requestCoordinates.longitude

                        );

                }


                return {
                    request,
                    distance
                };

            });


        return res.render(
            "trade/index",
            {
                requestsWithDistance
            }
        );


    } catch (error) {

        console.error(
            "TRADE BOARD ERROR:",
            error.message
        );


        return res.status(500).send(
            "Unable to load trade board"
        );

    }

};


// ========================================
// SHOW CREATE TRADE PAGE
// ========================================

export const showCreateTrade = (req, res) => {

    return res.render(
        "trade/create"
    );

};


// ========================================
// CREATE TRADE REQUEST
// ========================================

export const createTradeRequest = async (req, res) => {

    try {

        const {
            product,
            quantity,
            unit,
            budget,
            maxDistance,
            fulfilment,
            description
        } = req.body;


        // --------------------------------
        // VALIDATE REQUIRED TEXT
        // --------------------------------

        if (
            !product ||
            product.trim() === ""
        ) {

            return res.status(400).send(
                "Product is required"
            );

        }


        if (
            !unit ||
            unit.trim() === ""
        ) {

            return res.status(400).send(
                "Unit is required"
            );

        }


        // --------------------------------
        // VALIDATE NUMBERS
        // --------------------------------

        const parsedQuantity =
            Number(quantity);

        const parsedBudget =
            Number(budget);

        const parsedMaxDistance =
            Number(maxDistance);


        if (
            !Number.isFinite(parsedQuantity) ||
            parsedQuantity <= 0
        ) {

            return res.status(400).send(
                "Quantity must be greater than 0"
            );

        }


        if (
            !Number.isFinite(parsedBudget) ||
            parsedBudget <= 0
        ) {

            return res.status(400).send(
                "Budget must be greater than 0"
            );

        }


        if (
            !Number.isFinite(parsedMaxDistance) ||
            parsedMaxDistance <= 0
        ) {

            return res.status(400).send(
                "Maximum distance must be greater than 0"
            );

        }


        // --------------------------------
        // VALIDATE FULFILMENT
        // --------------------------------

        const allowedFulfilment = [
            "pickup",
            "delivery",
            "either"
        ];


        if (
            !allowedFulfilment.includes(
                fulfilment
            )
        ) {

            return res.status(400).send(
                "Invalid fulfilment option"
            );

        }


        // --------------------------------
        // FIND CURRENT SHOP
        // --------------------------------

        const shop =
            await Shop.findById(
                req.session.shopId
            );


        if (!shop) {

            return res.status(404).send(
                "Shop not found"
            );

        }


        // --------------------------------
        // CREATE REQUEST
        // --------------------------------

        await TradeRequest.create({

            shop:
                shop._id,

            product:
                product.trim(),

            quantity:
                parsedQuantity,

            unit:
                unit.trim(),

            budget:
                parsedBudget,

            address:
                shop.address,

            coordinates:
                shop.coordinates,

            maxDistance:
                parsedMaxDistance,

            fulfilment,

            description:
                description
                    ? description.trim()
                    : ""

        });


        return res.redirect(
            "/trade"
        );


    } catch (error) {

        console.error(
            "CREATE TRADE ERROR:",
            error.message
        );


        return res.status(500).send(
            "Unable to create trade request"
        );

    }

};


// ========================================
// SHOW TRADE DETAILS
// ========================================

export const showTradeDetails = async (req, res) => {

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


        const request =
            await TradeRequest
                .findById(
                    req.params.id
                )
                .populate("shop");


        if (!request) {

            return res.status(404).send(
                "Trade request not found"
            );

        }


        if (!request.shop) {

            return res.status(404).send(
                "Trade shop not found"
            );

        }


        const currentShopId =
            req.session.shopId;


        let acceptedOffer =
            null;

        let successfulPayment =
            null;


        // --------------------------------
        // FIND ACCEPTED OFFER
        // --------------------------------

        if (
            [
                "accepted",
                "fulfilled",
                "completed"
            ].includes(request.status)
        ) {

            acceptedOffer =
                await Offer.findOne({

                    tradeRequest:
                        request._id,

                    status:
                        "accepted"

                });


            // --------------------------------
            // FIND SUCCESSFUL PAYMENT
            // --------------------------------

            if (acceptedOffer) {

                successfulPayment =
                    await Payment.findOne({

                        offer:
                            acceptedOffer._id,

                        tradeRequest:
                            request._id,

                        payer:
                            acceptedOffer.buyer,

                        payee:
                            acceptedOffer.seller,

                        status:
                            "successful"

                    });

            }

        }


        return res.render(
            "trade/details",
            {
                request,
                currentShopId,
                acceptedOffer,
                successfulPayment
            }
        );


    } catch (error) {

        console.error(
            "SHOW TRADE DETAILS ERROR:",
            error.message
        );


        return res.status(500).send(
            "Unable to load trade request"
        );

    }

};


// ========================================
// SHOW MY REQUESTS
// ========================================

export const showMyRequests = async (req, res) => {

    try {

        const requests =
            await TradeRequest
                .find({
                    shop:
                        req.session.shopId
                })
                .sort({
                    createdAt: -1
                });


        return res.render(
            "trade/myRequests",
            {
                requests
            }
        );


    } catch (error) {

        console.error(
            "SHOW MY REQUESTS ERROR:",
            error.message
        );


        return res.status(500).send(
            "Unable to load your requests"
        );

    }

};


// ========================================
// MARK PAID TRADE AS FULFILLED
// SELLER ONLY
// ========================================

export const fulfillTrade = async (req, res) => {

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
            await TradeRequest.findById(
                req.params.id
            );


        if (!tradeRequest) {

            return res.status(404).send(
                "Trade request not found"
            );

        }


        // --------------------------------
        // PREVENT DUPLICATE FULFILMENT
        // --------------------------------

        if (
            tradeRequest.status ===
            "fulfilled"
        ) {

            return res.redirect(
                `/trade/${tradeRequest._id}`
            );

        }


        if (
            tradeRequest.status ===
            "completed"
        ) {

            return res.redirect(
                `/trade/${tradeRequest._id}`
            );

        }


        if (
            tradeRequest.status !==
            "accepted"
        ) {

            return res.status(400).send(
                "This trade cannot be marked as fulfilled"
            );

        }


        // --------------------------------
        // FIND ACCEPTED OFFER
        // --------------------------------

        const offer =
            await Offer.findOne({

                tradeRequest:
                    tradeRequest._id,

                status:
                    "accepted"

            });


        if (!offer) {

            return res.status(404).send(
                "Accepted offer not found"
            );

        }


        // --------------------------------
        // SELLER ONLY
        // --------------------------------

        if (
            offer.seller.toString() !==
            req.session.shopId.toString()
        ) {

            return res.status(403).send(
                "Only the seller can mark this trade as fulfilled"
            );

        }


        // --------------------------------
        // VERIFIED SUCCESSFUL PAYMENT
        // --------------------------------

        const payment =
            await Payment.findOne({

                offer:
                    offer._id,

                tradeRequest:
                    tradeRequest._id,

                payer:
                    offer.buyer,

                payee:
                    offer.seller,

                status:
                    "successful"

            });


        if (!payment) {

            return res.status(400).send(
                "This trade has not been paid yet"
            );

        }


        // --------------------------------
        // MARK FULFILLED
        // --------------------------------

        tradeRequest.status =
            "fulfilled";

        tradeRequest.fulfilledAt =
            new Date();


        await tradeRequest.save();


        // --------------------------------
        // NOTIFY BUYER
        // --------------------------------

        const buyerShop =
            await Shop.findById(
                offer.buyer
            );


        if (buyerShop?.owner) {

            const existingNotification =
                await Notification.findOne({

                    user:
                        buyerShop.owner,

                    type:
                        "trade_fulfilled",

                    relatedTrade:
                        tradeRequest._id,

                    relatedOffer:
                        offer._id

                });


            if (!existingNotification) {

                await Notification.create({

                    user:
                        buyerShop.owner,

                    type:
                        "trade_fulfilled",

                    message:
                        `${tradeRequest.product} has been marked as fulfilled. Confirm when you receive it.`,

                    relatedTrade:
                        tradeRequest._id,

                    relatedOffer:
                        offer._id,

                    relatedShop:
                        offer.seller,

                    relatedPayment:
                        payment._id

                });

            }

        }


        return res.redirect(
            `/trade/${tradeRequest._id}`
        );


    } catch (error) {

        console.error(
            "FULFILL TRADE ERROR:",
            error.message
        );


        return res.status(500).send(
            "Unable to mark trade as fulfilled"
        );

    }

};


// ========================================
// COMPLETE FULFILLED TRADE
// BUYER ONLY
// ========================================

export const completeTrade = async (req, res) => {

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
            await TradeRequest.findById(
                req.params.id
            );


        if (!tradeRequest) {

            return res.status(404).send(
                "Trade request not found"
            );

        }


        // --------------------------------
        // PREVENT DUPLICATE COMPLETION
        // --------------------------------

        if (
            tradeRequest.status ===
            "completed"
        ) {

            return res.redirect(
                `/trade/${tradeRequest._id}`
            );

        }


        if (
            tradeRequest.status !==
            "fulfilled"
        ) {

            return res.status(400).send(
                "This trade is not ready to be completed"
            );

        }


        // --------------------------------
        // FIND ACCEPTED OFFER
        // --------------------------------

        const offer =
            await Offer.findOne({

                tradeRequest:
                    tradeRequest._id,

                status:
                    "accepted"

            });


        if (!offer) {

            return res.status(404).send(
                "Accepted offer not found"
            );

        }


        // --------------------------------
        // BUYER ONLY
        // --------------------------------

        if (
            offer.buyer.toString() !==
            req.session.shopId.toString()
        ) {

            return res.status(403).send(
                "Only the buyer can complete this trade"
            );

        }


        // --------------------------------
        // VERIFIED SUCCESSFUL PAYMENT
        // --------------------------------

        const payment =
            await Payment.findOne({

                offer:
                    offer._id,

                tradeRequest:
                    tradeRequest._id,

                payer:
                    offer.buyer,

                payee:
                    offer.seller,

                status:
                    "successful"

            });


        if (!payment) {

            return res.status(400).send(
                "Successful payment not found"
            );

        }


        // --------------------------------
        // COMPLETE TRADE
        // --------------------------------

        tradeRequest.status =
            "completed";

        tradeRequest.completedAt =
            new Date();


        await tradeRequest.save();


        // --------------------------------
        // NOTIFY SELLER
        // --------------------------------

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
                        "trade_completed",

                    relatedTrade:
                        tradeRequest._id,

                    relatedOffer:
                        offer._id

                });


            if (!existingNotification) {

                await Notification.create({

                    user:
                        sellerShop.owner,

                    type:
                        "trade_completed",

                    message:
                        `${tradeRequest.product} has been confirmed as completed.`,

                    relatedTrade:
                        tradeRequest._id,

                    relatedOffer:
                        offer._id,

                    relatedShop:
                        offer.buyer,

                    relatedPayment:
                        payment._id

                });

            }

        }


        return res.redirect(
            `/trade/${tradeRequest._id}`
        );


    } catch (error) {

        console.error(
            "COMPLETE TRADE ERROR:",
            error.message
        );


        return res.status(500).send(
            "Unable to complete trade"
        );

    }

};