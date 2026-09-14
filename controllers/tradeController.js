import TradeRequest from "../models/TradeRequest.js";
import Shop from "../models/Shop.js";
import { calculateDistance } from "../utils/calculateDistance.js";

// Show trade board
export const showTradeBoard = async (req, res) => {

    try {

        const currentShop = await Shop.findById(
            req.session.shopId
        );

        if (!currentShop) {
            return res.status(404).send("Shop not found");
        }


        const requests = await TradeRequest
            .find({
                status: "open",
                shop: { $ne: currentShop._id }
            })
            .populate("shop");

        const requestsWithDistance = requests.map(request => {

            let distance = null;

            const currentCoordinates = currentShop.coordinates;
            const requestCoordinates = request.coordinates;


            if (
                currentCoordinates?.latitude != null &&
                currentCoordinates?.longitude != null &&
                requestCoordinates?.latitude != null &&
                requestCoordinates?.longitude != null
            ) {

                distance = calculateDistance(
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


        res.render("trade/index", {
            requestsWithDistance
        });


    } catch (error) {

        console.error(error);

        res.status(500).send("Unable to load trade board");

    }

};


// Show create trade page

export const showCreateTrade = (req, res) => {

    res.render("trade/create");

};


// Create trade request

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


        // Find the shop belonging to the logged-in user

        const shop = await Shop.findById(req.session.shopId);

        if (!shop) {
            return res.status(404).send("Shop not found");
        }


        // Create request

        await TradeRequest.create({

            shop: shop._id,

            product,

            quantity,

            unit,

            budget,

            address: shop.address,

            coordinates: shop.coordinates,

            maxDistance,

            fulfilment,

            description

        });


        res.redirect("/trade");

    } catch (error) {

        console.error(error);

        res.status(500).send("Unable to create trade request");

    }

};
export const showTradeDetails = async (req, res) => {

    try {

        const request = await TradeRequest
            .findById(req.params.id)
            .populate("shop");

        if (!request) {
            return res.status(404).send("Trade request not found");
        }

        res.render("trade/details", {
            request
        });

    } catch (error) {

        console.error(error);

        res.status(500).send("Unable to load trade request");

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


        res.render("trade/myRequests", {
            requests
        });


    } catch (error) {

        console.error(error);

        res.status(500).send("Unable to load your requests");

    }

};