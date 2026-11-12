
import mongoose from "mongoose";

const shopSchema = new mongoose.Schema({

    name: {
        type: String,
        required: true
    },

    walletAddress: {
        type: String,
        trim: true,
        default: ""
    },

    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    category: {
        type: String
    },

    description: {
        type: String
    },

    address: {
        type: String,
        required: true
    },

    coordinates: {
        latitude: {
            type: Number
        },

        longitude: {
            type: Number
        }
    },

    paymentEndpoint: {
        type: String
    },

    rating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },

    ratingCount: {
        type: Number,
        default: 0,
        min: 0
    }

}, {
    timestamps: true
});

const Shop = mongoose.model("Shop", shopSchema);

export default Shop;
