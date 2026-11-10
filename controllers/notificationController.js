import mongoose from "mongoose";
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

        return res.render("notifications/index", {
            notifications
        });

    } catch (error) {

        console.error(
            "SHOW NOTIFICATIONS ERROR:",
            error
        );

        return res.status(500).send(
            "Unable to load notifications"
        );

    }

};


export const openNotification = async (req, res) => {

    try {

        if (
            !mongoose.Types.ObjectId.isValid(
                req.params.id
            )
        ) {

            return res.status(400).send(
                "Invalid notification"
            );

        }


        const notification =
            await Notification.findOne({

                _id:
                    req.params.id,

                user:
                    req.session.userId

            });


        if (!notification) {

            return res.status(404).send(
                "Notification not found"
            );

        }


        if (!notification.read) {

            notification.read = true;

            await notification.save();

        }


        if (
            notification.type === "new_message" &&
            notification.relatedShop
        ) {

            return res.redirect(
                `/messages/${notification.relatedShop}`
            );

        }


        const offerNotificationTypes = [
            "new_offer",
            "offer_accepted",
            "offer_declined"
        ];


        if (
            offerNotificationTypes.includes(
                notification.type
            ) &&
            notification.relatedOffer
        ) {

            return res.redirect(
                `/offers/${notification.relatedOffer}`
            );

        }


        if (
            notification.type === "payment_received" &&
            notification.relatedTransaction &&
            !notification.relatedTrade
        ) {

            return res.redirect(
                `/transactions/${notification.relatedTransaction}`
            );

        }


        if (notification.relatedTrade) {

            return res.redirect(
                `/trade/${notification.relatedTrade}`
            );

        }


        if (notification.relatedTransaction) {

            return res.redirect(
                `/transactions/${notification.relatedTransaction}`
            );

        }


        if (notification.relatedOffer) {

            return res.redirect(
                `/offers/${notification.relatedOffer}`
            );

        }


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

        const unreadCount =
            await Notification.countDocuments({

                user:
                    req.session.userId,

                read:
                    false

            });


        return res.json({
            unreadCount
        });


    } catch (error) {

        console.error(
            "UNREAD NOTIFICATION COUNT ERROR:",
            error
        );

        return res.status(500).json({
            unreadCount: 0
        });

    }

};


export const markAllNotificationsRead = async (req, res) => {

    try {

        await Notification.updateMany(

            {
                user:
                    req.session.userId,

                read:
                    false
            },

            {
                $set: {
                    read: true
                }
            }

        );


        return res.redirect(
            "/notifications"
        );


    } catch (error) {

        console.error(
            "MARK ALL NOTIFICATIONS READ ERROR:",
            error
        );

        return res.status(500).send(
            "Unable to mark notifications as read"
        );

    }

};