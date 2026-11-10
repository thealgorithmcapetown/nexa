import mongoose from "mongoose";

import TradeRequest from "../models/TradeRequest.js";
import Shop from "../models/Shop.js";
import Offer from "../models/Offer.js";
import Payment from "../models/Payment.js";
import Notification from "../models/Notification.js";
import Rating from "../models/Rating.js";

import { calculateDistance } from "../utils/calculateDistance.js";


const hasValidCoordinates = (coordinates) => {

    if (
        coordinates?.latitude == null ||
        coordinates?.longitude == null ||
        coordinates.latitude === "" ||
        coordinates.longitude === ""
    ) {
        return false;
    }

    const latitude = Number(coordinates.latitude);
    const longitude = Number(coordinates.longitude);

    return (
        Number.isFinite(latitude) &&
        Number.isFinite(longitude) &&
        latitude >= -90 &&
        latitude <= 90 &&
        longitude >= -180 &&
        longitude <= 180
    );
};


export const showTradeBoard = async (req, res) => {

    try {

        const currentShop = await Shop.findById(
            req.session.shopId
        );

        if (!currentShop) {
            return res.status(404).send("Shop not found");
        }


        const search =
            typeof req.query.search === "string"
                ? req.query.search.trim()
                : "";

        const fulfilment =
            typeof req.query.fulfilment === "string"
                ? req.query.fulfilment
                : "";

        const maxBudget = req.query.maxBudget
            ? Number(req.query.maxBudget)
            : null;

        const distanceFilter = req.query.distance
            ? Number(req.query.distance)
            : null;


        const query = {

            status: "open",

            shop: {
                $ne: currentShop._id
            }

        };


        if (search) {

            query.product = {
                $regex: search,
                $options: "i"
            };

        }


        if (
            fulfilment === "pickup" ||
            fulfilment === "delivery"
        ) {

            query.fulfilment = {
                $in: [fulfilment, "either"]
            };

        }


        if (
            maxBudget !== null &&
            Number.isFinite(maxBudget) &&
            maxBudget > 0
        ) {

            query.budget = {
                $lte: maxBudget
            };

        }


        const requests = await TradeRequest
            .find(query)
            .populate("shop")
            .sort({ createdAt: -1 });


        const requestsWithDistance = requests

            .filter(request => request.shop)

            .map(request => {

                let distance = null;

                const currentCoordinates =
                    currentShop.coordinates;

                const requestCoordinates =
                    hasValidCoordinates(request.coordinates)
                        ? request.coordinates
                        : request.shop.coordinates;


                if (
                    hasValidCoordinates(currentCoordinates) &&
                    hasValidCoordinates(requestCoordinates)
                ) {

                    distance = calculateDistance(

                        Number(currentCoordinates.latitude),
                        Number(currentCoordinates.longitude),

                        Number(requestCoordinates.latitude),
                        Number(requestCoordinates.longitude)

                    );

                }


                return {
                    request,
                    distance
                };

            })


            .filter(item => {

                const requestMaxDistance = Number(
                    item.request.maxDistance
                );

                const validDistanceFilter =
                    distanceFilter !== null &&
                    Number.isFinite(distanceFilter) &&
                    distanceFilter > 0;


                if (item.distance === null) {
                    return !validDistanceFilter;
                }


                if (
                    Number.isFinite(requestMaxDistance) &&
                    requestMaxDistance > 0 &&
                    item.distance > requestMaxDistance
                ) {
                    return false;
                }


                if (
                    validDistanceFilter &&
                    item.distance > distanceFilter
                ) {
                    return false;
                }


                return true;

            });


        return res.render("trade/index", {

            requestsWithDistance,

            filters: {

                search,

                fulfilment,

                maxBudget:
                    Number.isFinite(maxBudget)
                        ? maxBudget
                        : "",

                distance:
                    Number.isFinite(distanceFilter)
                        ? distanceFilter
                        : ""

            }

        });

    } catch (error) { // DONT TOUCH THIS CATCH , I STOOD HERE FOR 5 HOURS AND FIXED IT, MATTER FACT DONT TOUCH THE WHOLE FUNCTION ILL BE THE ONLY ONE HERE BRO

        console.error(
            "TRADE BOARD ERROR:",
            error.message
        );

        return res.status(500).send(
            "Unable to load trade board"
        );

    }

};


export const showCreateTrade = (req, res) => {

    return res.render("trade/create");

};


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


        if (
            typeof product !== "string" ||
            product.trim() === ""
        ) {

            return res.status(400).send(
                "Product is required"
            );

        }

        if (
            typeof unit !== "string" ||
            unit.trim() === ""
        ) {

            return res.status(400).send(
                "Unit is required"
            );

        }


        const parsedQuantity = Number(quantity);
        const parsedBudget = Number(budget);
        const parsedMaxDistance = Number(maxDistance);

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


        const allowedFulfilment = [
            "pickup",
            "delivery",
            "either"
        ];

        if (!allowedFulfilment.includes(fulfilment)) {

            return res.status(400).send(
                "Invalid fulfilment option"
            );

        }


        const shop = await Shop.findById(
            req.session.shopId
        );

        if (!shop) {

            return res.status(404).send(
                "Shop not found"
            );

        }


        if (!hasValidCoordinates(shop.coordinates)) {

            return res.status(400).send(
                "Your shop does not have a confirmed map location"
            );

        }


        await TradeRequest.create({

            shop: shop._id,

            product: product.trim(),

            quantity: parsedQuantity,

            unit: unit.trim(),

            budget: parsedBudget,

            address: shop.address,

            coordinates: {
                latitude: Number(shop.coordinates.latitude),
                longitude: Number(shop.coordinates.longitude)
            },

            maxDistance: parsedMaxDistance,

            fulfilment,

            description:
                typeof description === "string"
                    ? description.trim()
                    : ""

        });


        return res.redirect("/trade");

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


        const request = await TradeRequest
            .findById(req.params.id)
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


        const currentShopId = req.session.shopId;

        let acceptedOffer = null;
        let successfulPayment = null;

        let existingRating = null;
        let buyerShopName = null;
        let sellerShopName = null;


        if (
            [
                "accepted",
                "fulfilled",
                "completed"
            ].includes(request.status)
        ) {

            acceptedOffer = await Offer.findOne({

                tradeRequest: request._id,

                status: "accepted"

            });


            if (acceptedOffer) {

                successfulPayment = await Payment.findOne({

                    offer: acceptedOffer._id,

                    tradeRequest: request._id,

                    payer: acceptedOffer.buyer,

                    payee: acceptedOffer.seller,

                    status: "successful"

                });


                const [buyerShop, sellerShop] = await Promise.all([

                    Shop.findById(acceptedOffer.buyer),

                    Shop.findById(acceptedOffer.seller)

                ]);

                buyerShopName = buyerShop?.name || "the buyer";
                sellerShopName = sellerShop?.name || "the seller";


                if (request.status === "completed") {

                    const currentShopString = String(currentShopId || "");

                    const isParticipant =
                        currentShopString === String(acceptedOffer.buyer) ||
                        currentShopString === String(acceptedOffer.seller);

                    if (isParticipant) {

                        existingRating = await Rating.findOne({

                            tradeRequest: request._id,

                            fromShop: currentShopId

                        });

                    }

                }

            }

        }


        return res.render("trade/details", {

            request,
            currentShopId,
            acceptedOffer,
            successfulPayment,
            existingRating,
            buyerShopName,
            sellerShopName

        });

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


export const showMyRequests = async (req, res) => {

    try {

        const requests = await TradeRequest
            .find({
                shop: req.session.shopId
            })
            .sort({
                createdAt: -1
            });


        return res.render("trade/myRequests", {
            requests
        });

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


        const tradeRequest = await TradeRequest.findById(
            req.params.id
        );

        if (!tradeRequest) {

            return res.status(404).send(
                "Trade request not found"
            );

        }


        if (
            tradeRequest.status === "fulfilled" ||
            tradeRequest.status === "completed"
        ) {

            return res.redirect(
                `/trade/${tradeRequest._id}`
            );

        }

        if (tradeRequest.status !== "accepted") {

            return res.status(400).send(
                "This trade cannot be marked as fulfilled"
            );

        }


        const offer = await Offer.findOne({

            tradeRequest: tradeRequest._id,

            status: "accepted"

        });

        if (!offer) {

            return res.status(404).send(
                "Accepted offer not found"
            );

        }


        if (
            offer.seller.toString() !==
            req.session.shopId.toString()
        ) {

            return res.status(403).send(
                "Only the seller can mark this trade as fulfilled"
            );

        }


        const payment = await Payment.findOne({

            offer: offer._id,

            tradeRequest: tradeRequest._id,

            payer: offer.buyer,

            payee: offer.seller,

            status: "successful"

        });

        if (!payment) {

            return res.status(400).send(
                "This trade has not been paid yet"
            );

        }


        tradeRequest.status = "fulfilled";

        tradeRequest.fulfilledAt = new Date();

        await tradeRequest.save();


        const buyerShop = await Shop.findById(
            offer.buyer
        );

        if (buyerShop?.owner) {

            const existingNotification =
                await Notification.findOne({

                    user: buyerShop.owner,

                    type: "trade_fulfilled",

                    relatedTrade: tradeRequest._id,

                    relatedOffer: offer._id

                });


            if (!existingNotification) {

                await Notification.create({

                    user: buyerShop.owner,

                    type: "trade_fulfilled",

                    message:
                        `${tradeRequest.product} has been marked as fulfilled. Confirm when you receive it.`,

                    relatedTrade: tradeRequest._id,

                    relatedOffer: offer._id,

                    relatedShop: offer.seller,

                    relatedPayment: payment._id

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


        const tradeRequest = await TradeRequest.findById(
            req.params.id
        );

        if (!tradeRequest) {

            return res.status(404).send(
                "Trade request not found"
            );

        }


        if (tradeRequest.status === "completed") {

            return res.redirect(
                `/trade/${tradeRequest._id}`
            );

        }

        if (tradeRequest.status !== "fulfilled") {

            return res.status(400).send(
                "This trade is not ready to be completed"
            );

        }


        const offer = await Offer.findOne({

            tradeRequest: tradeRequest._id,

            status: "accepted"

        });

        if (!offer) {

            return res.status(404).send(
                "Accepted offer not found"
            );

        }


        if (
            offer.buyer.toString() !==
            req.session.shopId.toString()
        ) {

            return res.status(403).send(
                "Only the buyer can complete this trade"
            );

        }


        const payment = await Payment.findOne({

            offer: offer._id,

            tradeRequest: tradeRequest._id,

            payer: offer.buyer,

            payee: offer.seller,

            status: "successful"

        });

        if (!payment) {

            return res.status(400).send(
                "Successful payment not found"
            );

        }


        tradeRequest.status = "completed";

        tradeRequest.completedAt = new Date();

        await tradeRequest.save();


        const sellerShop = await Shop.findById(
            offer.seller
        );

        if (sellerShop?.owner) {

            const existingNotification =
                await Notification.findOne({

                    user: sellerShop.owner,

                    type: "trade_completed",

                    relatedTrade: tradeRequest._id,

                    relatedOffer: offer._id

                });


            if (!existingNotification) {

                await Notification.create({

                    user: sellerShop.owner,

                    type: "trade_completed",

                    message:
                        `${tradeRequest.product} has been confirmed as completed.`,

                    relatedTrade: tradeRequest._id,

                    relatedOffer: offer._id,

                    relatedShop: offer.buyer,

                    relatedPayment: payment._id

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


export const cancelTrade = async (req, res) => {

    try {

        const tradeRequest = await TradeRequest.findById(
            req.params.id
        );

        if (!tradeRequest) {

            return res.status(404).send(
                "Trade request not found"
            );

        }

        // (teamWaterMark) theAlgorithm made this webApp with love and care, it took us 1.2 months but we finally got it!

        if (
            tradeRequest.shop.toString() !==
            req.session.shopId.toString()
        ) {

            return res.status(403).send(
                "You cannot cancel this trade request"
            );

        }


        if (tradeRequest.status !== "open") {

            return res.status(400).send(
                "Only open trade requests can be cancelled"
            );

        }


        tradeRequest.status = "cancelled";

        await tradeRequest.save();


        await Offer.updateMany(

            {
                tradeRequest: tradeRequest._id,
                status: "pending"
            },

            {
                $set: {
                    status: "withdrawn"
                }
            }

        );


        console.log(
            "TRADE CANCELLED:",
            tradeRequest._id
        );


        return res.redirect(
            "/trade/my-requests"
        );

    } catch (error) {

        console.error(
            "CANCEL TRADE ERROR:",
            error
        );

        return res.status(500).send(
            "Unable to cancel trade request"
        );

    }

};