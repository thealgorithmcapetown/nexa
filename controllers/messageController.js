import Message from "../models/Message.js";
import Shop from "../models/Shop.js";
import Notification from "../models/Notification.js";
import TradeRequest from "../models/TradeRequest.js";

// SHOW ALL CONVERSATIONS
export const showMessages = async (req, res) => {

    try {

        const currentShopId = req.session.shopId;


        const messages = await Message.find({

            $or: [
                { sender: currentShopId },
                { receiver: currentShopId }
            ]

        })
            .populate("sender")
            .populate("receiver")
            .sort({ createdAt: -1 });


        const conversationsMap = new Map();


        messages.forEach(message => {

            const otherShop =
                message.sender._id.toString() === currentShopId.toString()
                    ? message.receiver
                    : message.sender;


            if (!conversationsMap.has(otherShop._id.toString())) {

                conversationsMap.set(
                    otherShop._id.toString(),
                    {
                        shop: otherShop,
                        lastMessage: message
                    }
                );

            }

        });


        const conversations = Array.from(
            conversationsMap.values()
        );


        return res.render("messages/index", {
            conversations
        });


    } catch (error) {

        console.error("SHOW MESSAGES ERROR:", error);

        return res.status(500).send(
            "Unable to load messages"
        );

    }

};


// SHOW ONE CHAT
export const showChat = async (req, res) => {

    try {

        const currentShopId = req.session.shopId;

        const otherShopId = req.params.shopId;

        const tradeId = req.query.trade;


        const otherShop = await Shop.findById(
            otherShopId
        );


        if (!otherShop) {

            return res.status(404).send(
                "Shop not found"
            );

        }


        if (
            otherShop._id.toString() ===
            currentShopId.toString()
        ) {

            return res.status(400).send(
                "You cannot message your own shop"
            );

        }


        let tradeRequest = null;


        if (tradeId) {

            tradeRequest = await TradeRequest.findById(
                tradeId
            );


            if (!tradeRequest) {

                return res.status(404).send(
                    "Trade request not found"
                );

            }


            const tradeOwnerId =
                tradeRequest.shop.toString();


            if (
                tradeOwnerId !== currentShopId.toString() &&
                tradeOwnerId !== otherShopId.toString()
            ) {

                return res.status(403).send(
                    "This chat is not related to your shop"
                );

            }

        }


        const messageFilter = {

            $or: [

                {
                    sender: currentShopId,
                    receiver: otherShopId
                },

                {
                    sender: otherShopId,
                    receiver: currentShopId
                }

            ]

        };


        if (tradeId) {

            messageFilter.tradeRequest = tradeId;

        }


        const messages = await Message.find(
            messageFilter
        )
            .populate("sender")
            .populate("receiver")
            .populate("tradeRequest")
            .sort({ createdAt: 1 });


        const unreadFilter = {

            sender: otherShopId,

            receiver: currentShopId,

            read: false

        };


        if (tradeId) {

            unreadFilter.tradeRequest = tradeId;

        }


        await Message.updateMany(

            unreadFilter,

            {
                $set: {
                    read: true
                }
            }

        );


        return res.render("messages/chat", {

            messages,

            otherShop,

            currentShopId,

            tradeRequest

        });


    } catch (error) {

        console.error(
            "SHOW CHAT ERROR:",
            error
        );

        return res.status(500).send(
            "Unable to load chat"
        );

    }

};

// SEND MESSAGE
export const sendMessage = async (req, res) => {

    try {

        const currentShopId = req.session.shopId;

        const otherShopId = req.params.shopId;

        const tradeId = req.query.trade;

        const { content } = req.body;


        if (!content || content.trim() === "") {

            return res.status(400).send(
                "Message cannot be empty"
            );

        }


        const senderShop = await Shop.findById(
            currentShopId
        );


        const receiverShop = await Shop.findById(
            otherShopId
        );


        if (!senderShop) {

            return res.status(404).send(
                "Sender shop not found"
            );

        }


        if (!receiverShop) {

            return res.status(404).send(
                "Receiver shop not found"
            );

        }


        if (
            senderShop._id.toString() ===
            receiverShop._id.toString()
        ) {

            return res.status(400).send(
                "You cannot message yourself"
            );

        }


        let tradeRequest = null;


        if (tradeId) {

            tradeRequest = await TradeRequest.findById(
                tradeId
            );


            if (!tradeRequest) {

                return res.status(404).send(
                    "Trade request not found"
                );

            }

        }


        await Message.create({

            sender: senderShop._id,

            receiver: receiverShop._id,

            tradeRequest: tradeRequest
                ? tradeRequest._id
                : undefined,

            content: content.trim()

        });


        if (receiverShop?.owner) {

            await Notification.create({

                user: receiverShop.owner,

                type: "new_message",

                message:
                    `${senderShop.name} sent you a message`,

                relatedShop: senderShop._id,

                relatedTrade: tradeRequest
                    ? tradeRequest._id
                    : undefined

            });

        }


        if (req.headers.accept?.includes("application/json")) {

            return res.json({
                success: true
            });

        }


        if (tradeRequest) {

            return res.redirect(
                `/messages/${receiverShop._id}?trade=${tradeRequest._id}`
            );

        }


        return res.redirect(
            `/messages/${receiverShop._id}`
        );

    } catch (error) {

        console.error(
            "SEND MESSAGE ERROR:",
            error
        );

        return res.status(500).send(
            "Unable to send message"
        );

    }

};
//unrd msg count 
export const getUnreadMessageCount = async (req, res) => {

    try {

        const unreadCount = await Message.countDocuments({
            receiver: req.session.shopId,
            read: false
        });

        return res.json({
            unreadCount
        });

    } catch (error) {

        console.error(
            "UNREAD MESSAGE COUNT ERROR:",
            error
        );

        return res.status(500).json({
            unreadCount: 0
        });

    }

};
export const markChatAsRead = async (req, res) => {

    try {

        const currentShopId = req.session.shopId;
        const otherShopId = req.params.shopId;

        await Message.updateMany(
            {
                sender: otherShopId,
                receiver: currentShopId,
                read: false
            },
            {
                $set: {
                    read: true
                }
            }
        );

        return res.json({
            success: true
        });

    } catch (error) {

        console.error(
            "MARK CHAT AS READ ERROR:",
            error
        );

        return res.status(500).json({
            success: false
        });

    }

};