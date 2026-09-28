import User from "../models/User.js";
import Shop from "../models/Shop.js";
import TradeRequest from "../models/TradeRequest.js";
import Offer from "../models/Offer.js";
import Transaction from "../models/Transaction.js";
import Message from "../models/Message.js";
import Notification from "../models/Notification.js";


export const showDashboard = async (req, res) => {

    try {

        // --------------------------------
        // USER
        // --------------------------------

        const user =
            await User.findById(
                req.session.userId
            );


        if (!user) {

            return res.redirect(
                "/login"
            );

        }


        // --------------------------------
        // SHOP
        // --------------------------------

        const shop =
            await Shop.findById(
                req.session.shopId
            );


        if (!shop) {

            return res.status(404).send(
                "Shop not found"
            );

        }


        // --------------------------------
        // ACTIVE TRADE REQUESTS
        // --------------------------------

        const activeTrades =
            await TradeRequest.find({

                shop:
                    shop._id,

                status: {
                    $in: [
                        "open",
                        "accepted",
                        "fulfilled"
                    ]
                }

            })
                .sort({
                    createdAt: -1
                })
                .limit(5);


        // --------------------------------
        // PENDING RECEIVED OFFERS
        // --------------------------------

        const pendingOffers =
            await Offer.countDocuments({

                buyer:
                    shop._id,

                status:
                    "pending"

            });


        // --------------------------------
        // RECENT TRANSACTIONS
        // --------------------------------

        const recentTransactions =
            await Transaction.find({

                $or: [

                    {
                        fromShop:
                            shop._id
                    },

                    {
                        toShop:
                            shop._id
                    }

                ]

            })
                .populate("fromShop")
                .populate("toShop")
                .populate("tradeRequest")
                .sort({
                    createdAt: -1
                })
                .limit(5);


        // --------------------------------
        // UNREAD MESSAGES
        // --------------------------------

        const unreadMessages =
            await Message.countDocuments({

                receiver:
                    shop._id,

                read:
                    false

            });


        // --------------------------------
        // UNREAD NOTIFICATIONS
        // --------------------------------

        const unreadNotifications =
            await Notification.countDocuments({

                user:
                    user._id,

                read:
                    false

            });


        // --------------------------------
        // RENDER
        // --------------------------------

        return res.render(
            "dashboard/dashboard",
            {
                user,
                shop,
                activeTrades,
                pendingOffers,
                recentTransactions,
                unreadMessages,
                unreadNotifications
            }
        );


    } catch (error) {

        console.error(
            "DASHBOARD ERROR:",
            error
        );


        return res.status(500).send(
            "Unable to load dashboard"
        );

    }

};