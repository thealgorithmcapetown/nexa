
import mongoose from "mongoose";

const ratingSchema = new mongoose.Schema({

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

    stars: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
        validate: {
            validator: Number.isInteger,
            message: "Rating must be a whole number"
        }
    },

    review: {
        type: String,
        trim: true,
        maxlength: 500,
        default: ""
    }

}, {
    timestamps: true
});


// One rating per vendor per trade
ratingSchema.index(
    {
        tradeRequest: 1,
        fromShop: 1
    },
    {
        unique: true
    }
);

const Rating = mongoose.model("Rating", ratingSchema);

export default Rating;
