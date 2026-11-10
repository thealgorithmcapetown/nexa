
import mongoose from "mongoose";

import Rating from "../models/Rating.js";
import Shop from "../models/Shop.js";
import TradeRequest from "../models/TradeRequest.js";
import Offer from "../models/Offer.js";


// ========================================
// SUBMIT VENDOR RATING
// ========================================

export const submitRating = async (req, res) => {

    try {

        const tradeId = req.params.id;
        const currentShopId = req.session.shopId;

        const {
            stars,
            review
        } = req.body;


        // Validate trade ID

        if (!mongoose.Types.ObjectId.isValid(tradeId)) {

            return res.status(400).send(
                "Invalid trade request"
            );

        }


        // Validate rating

        const parsedStars = Number(stars);

        if (
            stars == null ||
            String(stars).trim() === "" ||
            !Number.isInteger(parsedStars) ||
            parsedStars < 1 ||
            parsedStars > 5
        ) {

            return res.status(400).send(
                "Please select a rating between 1 and 5 stars"
            );

        }


        // Validate optional review

        if (
            review != null &&
            typeof review !== "string"
        ) {

            return res.status(400).send(
                "Invalid review"
            );

        }

        const cleanReview = review
            ? review.trim()
            : "";

        if (cleanReview.length > 500) {

            return res.status(400).send(
                "Review cannot exceed 500 characters"
            );

        }


        // Find trade request

        const tradeRequest = await TradeRequest.findById(
            tradeId
        );

        if (!tradeRequest) {

            return res.status(404).send(
                "Trade request not found"
            );

        }


        // Ratings are only allowed after completion

        if (tradeRequest.status !== "completed") {

            return res.status(400).send(
                "You can only rate vendors after a completed trade"
            );

        }


        // Find accepted offer to identify both vendors

        const acceptedOffer = await Offer.findOne({

            tradeRequest: tradeRequest._id,
            status: "accepted"

        });

        if (!acceptedOffer) {

            return res.status(404).send(
                "Accepted offer not found"
            );

        }


        // Confirm that the current vendor participated

        const buyerId = acceptedOffer.buyer.toString();
        const sellerId = acceptedOffer.seller.toString();

        const fromShopId = String(currentShopId || "");

        if (
            fromShopId !== buyerId &&
            fromShopId !== sellerId
        ) {

            return res.status(403).send(
                "Only vendors involved in this trade can submit a rating"
            );

        }


        // Determine which vendor receives the rating

        const toShopId =
            fromShopId === buyerId
                ? sellerId
                : buyerId;


        // Prevent duplicate ratings

        const existingRating = await Rating.findOne({

            tradeRequest: tradeRequest._id,
            fromShop: currentShopId

        });

        if (existingRating) {

            return res.status(400).send(
                "You have already rated this vendor for this trade"
            );

        }


        // Save rating

        try {

            await Rating.create({

                tradeRequest: tradeRequest._id,

                fromShop: currentShopId,

                toShop: toShopId,

                stars: parsedStars,

                review: cleanReview

            });

        } catch (error) {

            // Unique index also protects against duplicate submissions

            if (error.code === 11000) {

                return res.status(400).send(
                    "You have already rated this vendor for this trade"
                );

            }

            throw error;

        }


        // Recalculate the vendor's average rating

        const ratingStats = await Rating.aggregate([

            {
                $match: {
                    toShop: new mongoose.Types.ObjectId(toShopId)
                }
            },

            {
                $group: {

                    _id: "$toShop",

                    averageRating: {
                        $avg: "$stars"
                    },

                    totalRatings: {
                        $sum: 1
                    }

                }
            }

        ]);


        if (ratingStats.length > 0) {

            await Shop.findByIdAndUpdate(toShopId, {

                rating: Math.round(
                    ratingStats[0].averageRating * 10
                ) / 10,

                ratingCount: ratingStats[0].totalRatings

            });

        }


        // Return to the completed trade

        return res.redirect(
            `/trade/${tradeRequest._id}`
        );

    } catch (error) {

        console.error(
            "SUBMIT RATING ERROR:",
            error
        );

        return res.status(500).send(
            "Unable to submit vendor rating"
        );

    }

};
