import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({

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
        ref: "TradeRequest"
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

}, {
    timestamps: true
});

const Message = mongoose.model("Message", messageSchema);

export default Message;