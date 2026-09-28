import mongoose from "mongoose";


const paymentSchema = new mongoose.Schema(
    {
        offer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Offer",
            required: true,
            unique: true
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
            required: true,
            min: 0.01
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
            enum: [
                "open_payments"
            ],
            default: "open_payments"
        },

        providerTransactionId: {
            type: String,
            unique: true,
            sparse: true
        },

        completedAt: {
            type: Date,
            default: null
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