import Notification from "../models/Notification.js";


export const showNotifications = async (req, res) => {

    try {

        const notifications = await Notification
            .find({
                user: req.session.userId
            })
            .sort({
                createdAt: -1
            });

        res.render("notifications/index", {
            notifications
        });

    } catch (error) {

        console.error(error);

        res.status(500).send(
            "Unable to load notifications"
        );

    }

};
export const openNotification = async (req, res) => {

    try {

        const notification =
            await Notification.findById(
                req.params.id
            );


        if (!notification) {

            return res.status(404).send(
                "Notification not found"
            );

        }


        if (
            notification.user.toString() !==
            req.session.userId.toString()
        ) {

            return res.status(403).send(
                "Not authorized"
            );

        }


        // Mark notification as read

        notification.read = true;

        await notification.save();


        // ========================================
        // NEW MESSAGE
        // ========================================

        if (
            notification.type === "new_message" &&
            notification.relatedShop
        ) {

            return res.redirect(
                `/messages/${notification.relatedShop}`
            );

        }


        // ========================================
        // TRADE-RELATED NOTIFICATION
        //
        // IMPORTANT:
        // Check relatedTrade BEFORE transaction.
        //
        // Vendor trade payments should open the
        // trade so the seller can fulfil it.
        // ========================================

        if (notification.relatedTrade) {

            return res.redirect(
                `/trade/${notification.relatedTrade}`
            );

        }


        // ========================================
        // CUSTOMER PAYMENT
        //
        // Customer QR payments don't have a trade,
        // so take the vendor to the receipt.
        // ========================================

        if (
            notification.type === "payment_received" &&
            notification.relatedTransaction
        ) {

            return res.redirect(
                `/transactions/${notification.relatedTransaction}`
            );

        }


        // ========================================
        // OFFER
        // ========================================

        if (notification.relatedOffer) {

            return res.redirect(
                `/offers/${notification.relatedOffer}`
            );

        }


        // Nothing related — return to notifications

        return res.redirect(
            "/notifications"
        );


    } catch (error) {

        console.error(
            "OPEN NOTIFICATION ERROR:",
            error
        );


        return res.status(500).send(
            "Unable to open notification"
        );

    }

};
export const getUnreadNotificationCount = async (req, res) => {

    try {

        const unreadCount = await Notification.countDocuments({
            user: req.session.userId,
            read: false
        });

        return res.json({
            unreadCount
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            unreadCount: 0
        });

    }

};