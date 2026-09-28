import mongoose from "mongoose";


const messageSchema = new mongoose.Schema(
    {
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Shop",
            required: true
        },

        receiver: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Shop",
            required: true
        },

        tradeRequest: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "TradeRequest",
            default: null
        },

        content: {
            type: String,
            required: true,
            trim: true
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


// Fast conversation loading
messageSchema.index({
    sender: 1,
    receiver: 1,
    tradeRequest: 1,
    createdAt: 1
});


// Fast unread-message counting
messageSchema.index({
    receiver: 1,
    read: 1
});


const Message = mongoose.model(
    "Message",
    messageSchema
);


export default Message;