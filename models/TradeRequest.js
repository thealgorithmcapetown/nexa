import mongoose from "mongoose";

const tradeRequestSchema = new mongoose.Schema({

    shop: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Shop",
        required: true
    },

    product: {
        type: String,
        required: true
    },

    quantity: {
        type: Number,
        required: true
    },

    unit: {
        type: String,
        required: true
    },

    budget: {
        type: Number,
        required: true
    },

    address: {
        type: String,
        required: true
    },

    coordinates: {
        latitude: Number,
        longitude: Number
    },

    maxDistance: {
        type: Number,
        default: 5
    },

    fulfilment: {
        type: String,
        enum: [
            "pickup",
            "delivery",
            "either"
        ],
        default: "either"
    },

    description: {
        type: String
    },

    status: {
        type: String,
        enum: [
            "open",
            "accepted",
            "fulfilled",
            "completed",
            "cancelled"
        ],
        default: "open"
    },

    fulfilledAt: {
        type: Date
    },

    completedAt: {
        type: Date
    },

    expiresAt: {
        type: Date
    }

}, {
    timestamps: true
});


const TradeRequest = mongoose.model(
    "TradeRequest",
    tradeRequestSchema
);


export default TradeRequest;