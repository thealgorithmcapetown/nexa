
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

        paymentStage: {
            type: String,
            enum: [
                "created",
                "authorizing",
                "authorized",
                "submitting",
                "submitted",
                "completed"
            ],
            default: "created"
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

        failureReason: {
            type: String,
            default: null
        },

        attemptStartedAt: {
            type: Date,
            default: Date.now
        },

        expiresAt: {
            type: Date,
            default: function () {
                return new Date(
                    this.attemptStartedAt.getTime() + 60 * 1000
                );
            }
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

paymentSchema.methods.hasTimedOut = function () {
    if (!this.expiresAt) {
        return false;
    }

    return (
        this.status === "pending" &&
        new Date() >= this.expiresAt
    );
};

paymentSchema.methods.canSafelyExpire = function () {
    return (
        this.hasTimedOut() &&
        ["created", "authorizing"].includes(this.paymentStage) &&
        !this.providerTransactionId
    );
};

const Payment = mongoose.model(
    "Payment",
    paymentSchema
);

export default Payment;
