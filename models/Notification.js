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
                "payment_received",
                "trade_fulfilled",
                "trade_completed"
            ],
            required: true
        },

        message: {
            type: String,
            required: true,
            trim: true
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

        relatedTransaction: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Transaction"
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


// --------------------------------
// INDEXES
// --------------------------------

// Fast notification list:
// Notification.find({ user }).sort({ createdAt: -1 })
notificationSchema.index({
    user: 1,
    createdAt: -1
});


// Fast unread notification count:
// Notification.countDocuments({
//     user,
//     read: false
// })
notificationSchema.index({
    user: 1,
    read: 1
});


const Notification = mongoose.model(
    "Notification",
    notificationSchema
);


export default Notification;