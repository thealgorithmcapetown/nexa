import Offer from "../models/Offer.js";
import Payment from "../models/Payment.js";
import Transaction from "../models/Transaction.js";
import Shop from "../models/Shop.js";
import Notification from "../models/Notification.js";


export const showOfferPayment = async (req, res) => {

    try {

        const offer = await Offer.findById(
            req.params.offerId
        )
            .populate("buyer")
            .populate("seller")
            .populate("tradeRequest");


        if (!offer) {

            return res.status(404).send(
                "Offer not found"
            );

        }


        if (offer.status !== "accepted") {

            return res.status(400).send(
                "Only accepted offers can be paid"
            );

        }


        if (
            offer.buyer._id.toString() !==
            req.session.shopId.toString()
        ) {

            return res.status(403).send(
                "Only the buyer can pay for this offer"
            );

        }


        const existingPayment =
            await Payment.findOne({
                offer: offer._id,
                status: "successful"
            });


        if (existingPayment) {

            return res.redirect(
                `/payments/${existingPayment._id}/success`
            );

        }


        return res.render(
            "payments/send",
            {
                offer
            }
        );


    } catch (error) {

        console.error(
            "SHOW PAYMENT ERROR:",
            error
        );

        return res.status(500).send(
            "Unable to load payment"
        );

    }

};



export const processOfferPayment = async (req, res) => {

    try {

        const offer = await Offer.findById(
            req.params.offerId
        )
            .populate("buyer")
            .populate("seller")
            .populate("tradeRequest");


        if (!offer) {

            return res.status(404).send(
                "Offer not found"
            );

        }


        if (offer.status !== "accepted") {

            return res.status(400).send(
                "Only accepted offers can be paid"
            );

        }


        if (
            offer.buyer._id.toString() !==
            req.session.shopId.toString()
        ) {

            return res.status(403).send(
                "You are not allowed to pay this offer"
            );

        }


        const existingPayment =
            await Payment.findOne({
                offer: offer._id,
                status: "successful"
            });


        if (existingPayment) {

            return res.redirect(
                `/payments/${existingPayment._id}/success`
            );

        }


        const payment = await Payment.create({

            offer: offer._id,

            tradeRequest:
                offer.tradeRequest._id,

            payer:
                offer.buyer._id,

            payee:
                offer.seller._id,

            amount:
                offer.amount,

            currency:
                "ZAR",

            status:
                "successful",

            method:
                "mock",

            completedAt:
                new Date()

        });


        const reference =
            `NEXA-${Date.now()}-${payment._id
                .toString()
                .slice(-6)
                .toUpperCase()}`;


        await Transaction.create({

            payment:
                payment._id,

            offer:
                offer._id,

            tradeRequest:
                offer.tradeRequest._id,

            fromShop:
                offer.buyer._id,

            toShop:
                offer.seller._id,

            amount:
                offer.amount,

            currency:
                "ZAR",

            type:
                "trade_payment",

            status:
                "successful",

            reference

        });


        const sellerShop =
            await Shop.findById(
                offer.seller._id
            );


        if (sellerShop?.owner) {

            await Notification.create({

                user:
                    sellerShop.owner,

                type:
                    "payment_received",

                message:
                    `Payment of R${offer.amount} received for ${offer.tradeRequest.product}`,

                relatedTrade:
                    offer.tradeRequest._id,

                relatedOffer:
                    offer._id,

                relatedPayment:
                    payment._id

            });

        }


        return res.redirect(
            `/payments/${payment._id}/success`
        );


    } catch (error) {

        console.error(
            "PROCESS PAYMENT ERROR:",
            error
        );

        return res.status(500).send(
            "Unable to process payment"
        );

    }

};



export const showPaymentSuccess = async (req, res) => {

    try {

        const payment =
            await Payment.findById(
                req.params.paymentId
            )
                .populate("payer")
                .populate("payee")
                .populate("tradeRequest")
                .populate("offer");


        if (!payment) {

            return res.status(404).send(
                "Payment not found"
            );

        }


        const currentShopId =
            req.session.shopId.toString();


        const isPayer =
            payment.payer._id.toString() ===
            currentShopId;


        const isPayee =
            payment.payee._id.toString() ===
            currentShopId;


        if (!isPayer && !isPayee) {

            return res.status(403).send(
                "You cannot view this payment"
            );

        }


        const transaction =
            await Transaction.findOne({
                payment: payment._id
            });


        return res.render(
            "payments/success",
            {
                payment,
                transaction
            }
        );


    } catch (error) {

        console.error(
            "PAYMENT SUCCESS ERROR:",
            error
        );

        return res.status(500).send(
            "Unable to load payment"
        );

    }

};
export const showPayments = async (req, res) => {

    try {

        const currentShopId =
            req.session.shopId;


        const recentTransactions =
            await Transaction.find({
                $or: [
                    {
                        fromShop:
                            currentShopId
                    },
                    {
                        toShop:
                            currentShopId
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


        return res.render(
            "payments/index",
            {
                recentTransactions,
                currentShopId
            }
        );


    } catch (error) {

        console.error(
            "SHOW PAYMENTS ERROR:",
            error
        );

        return res.status(500).send(
            "Unable to load payments"
        );

    }

};