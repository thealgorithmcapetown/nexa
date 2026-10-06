import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
    {
        payment: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Payment",
            required: false
        },

        offer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Offer",
            required: false
        },

        tradeRequest: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "TradeRequest",
            required: false
        },
        paymentRequest: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "PaymentRequest",
            required: false,
            unique: true,
            sparse: true
        },
        fromShop: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Shop",
            required: false
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
                "customer_payment",
                "direct_payment"
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
        },

        providerTransactionId: {
            type: String,
            unique: true,
            sparse: true
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