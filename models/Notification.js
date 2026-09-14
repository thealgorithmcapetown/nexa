import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        type: {
            type: String,
            enum: [
                "new_offer",
                "offer_accepted",
                "offer_declined",
                "new_message",
                "payment_received"
            ],
        },

        message: {
            type: String,
            required: true
        },

        relatedTrade: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "TradeRequest"
        },

        relatedOffer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Offer"
        },

        relatedShop: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Shop"
        },

        relatedPayment: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Payment"
        },

        read: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
);

const Notification = mongoose.model(
    "Notification",
    notificationSchema
);

export default Notification;