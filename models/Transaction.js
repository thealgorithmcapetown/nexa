import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
    {
        payment: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Payment",
            required: true
        },

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

        fromShop: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Shop",
            required: true
        },

        toShop: {
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

        type: {
            type: String,
            enum: [
                "trade_payment",
                "customer_payment"
            ],
            default: "trade_payment"
        },

        status: {
            type: String,
            enum: [
                "successful",
                "failed"
            ],
            default: "successful"
        },

        reference: {
            type: String,
            required: true,
            unique: true
        }
    },
    {
        timestamps: true
    }
);

const Transaction = mongoose.model(
    "Transaction",
    transactionSchema
);

export default Transaction;