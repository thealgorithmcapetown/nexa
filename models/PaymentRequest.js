import mongoose from "mongoose";

const paymentRequestSchema =
    new mongoose.Schema(
        {
            shop: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Shop",
                required: true
            },

            walletAddress: {
                type: String,
                required: true,
                trim: true
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

            reference: {
                type: String,
                required: true,
                trim: true
            },

            status: {
                type: String,
                enum: [
                    "pending",
                    "paid",
                    "expired",
                    "cancelled"
                ],
                default: "pending"
            },

            expiresAt: {
                type: Date
            }
        },
        {
            timestamps: true
        }
    );

const PaymentRequest =
    mongoose.model(
        "PaymentRequest",
        paymentRequestSchema
    );

export default PaymentRequest;