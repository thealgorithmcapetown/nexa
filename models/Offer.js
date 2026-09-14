import mongoose from "mongoose";

const offerSchema = new mongoose.Schema({

    tradeRequest: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "TradeRequest",
        required: true
    },

    seller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Shop",
        required: true
    },

    buyer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Shop",
        required: true
    },

    amount: {
        type: Number,
        required: true
    },

    quantity: {
        type: Number,
        required: true
    },

    delivery: {
        type: Boolean,
        default: false
    },

    message: {
        type: String
    },

    status: {
        type: String,
        enum: [
            "pending",
            "accepted",
            "declined",
            "withdrawn",
            "expired"
        ],
        default: "pending"
    }

}, {
    timestamps: true
});

const Offer = mongoose.model("Offer", offerSchema);

export default Offer;