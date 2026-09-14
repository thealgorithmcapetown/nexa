import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
    {
        offer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Offer",
            required: true
        },

        tradeRequest: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "TradeRequest",
            required: true
        },

        payer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Shop",
            required: true
        },

        payee: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Shop",
            required: true
        },

        amount: {
            type: Number,
            required: true
        },

        currency: {
            type: String,
            default: "ZAR"
        },

        status: {
            type: String,
            enum: [
                "pending",
                "successful",
                "failed"
            ],
            default: "pending"
        },

        method: {
            type: String,
            default: "mock"
        },

        completedAt: {
            type: Date
        }
    },
    {
        timestamps: true
    }
);

const Payment = mongoose.model(
    "Payment",
    paymentSchema
);

export default Payment;