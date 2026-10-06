import User from "../models/User.js";
import Shop from "../models/Shop.js";
import TradeRequest from "../models/TradeRequest.js";
import Offer from "../models/Offer.js";
import Transaction from "../models/Transaction.js";
import Message from "../models/Message.js";
import Notification from "../models/Notification.js";


export const showDashboard = async (req, res) => {

    try {

        // ========================================
        // USER + SHOP
        // ========================================

        const user =
            await User.findById(
                req.session.userId
            );


        if (!user) {

            return res.redirect("/login");

        }


        const shop =
            await Shop.findById(
                req.session.shopId
            );


        if (!shop) {

            return res.status(404).send(
                "Shop not found"
            );

        }


        const shopId =
            shop._id;


        // ========================================
        // ACTIVE TRADES
        // ========================================

        const activeTrades =
            await TradeRequest.countDocuments({

                shop: shopId,

                status: {
                    $in: [
                        "open",
                        "accepted",
                        "fulfilled"
                    ]
                }

            });


        // ========================================
        // PENDING OFFERS RECEIVED
        // ========================================

        const pendingOffers =
            await Offer.countDocuments({

                buyer: shopId,

                status: "pending"

            });


        // ========================================
        // UNREAD MESSAGES
        // ========================================

        const unreadMessages =
            await Message.countDocuments({

                receiver: shopId,

                read: false

            });


        // ========================================
        // UNREAD NOTIFICATIONS
        // ========================================

        const unreadNotifications =
            await Notification.countDocuments({

                user: user._id,

                read: false

            });


        // ========================================
        // RECENT TRANSACTIONS
        // ========================================

        const recentTransactions =
            await Transaction.find({

                $or: [

                    {
                        fromShop: shopId
                    },

                    {
                        toShop: shopId
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


        // ========================================
        // TOTAL MONEY SENT
        // ========================================

        const sentResult =
            await Transaction.aggregate([

                {
                    $match: {

                        fromShop: shopId,

                        status: "successful"

                    }
                },

                {
                    $group: {

                        _id: null,

                        total: {
                            $sum: "$amount"
                        }

                    }
                }

            ]);


        const totalSent =
            sentResult.length > 0
                ? sentResult[0].total
                : 0;


        // ========================================
        // TOTAL MONEY RECEIVED
        // ========================================

        const receivedResult =
            await Transaction.aggregate([

                {
                    $match: {

                        toShop: shopId,

                        status: "successful"

                    }
                },

                {
                    $group: {

                        _id: null,

                        total: {
                            $sum: "$amount"
                        }

                    }
                }

            ]);


        const totalReceived =
            receivedResult.length > 0
                ? receivedResult[0].total
                : 0;


        // ========================================
        // RENDER
        // ========================================

        return res.render(
            "dashboard/dashboard",
            {

                user,

                shop,

                activeTrades,

                pendingOffers,

                unreadMessages,

                unreadNotifications,

                recentTransactions,

                totalSent,

                totalReceived

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