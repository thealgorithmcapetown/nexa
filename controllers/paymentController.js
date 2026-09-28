import Offer from "../models/Offer.js";
import Payment from "../models/Payment.js";
import Transaction from "../models/Transaction.js";
import Shop from "../models/Shop.js";
import Notification from "../models/Notification.js";
import QRCode from "qrcode";
import PaymentRequest from "../models/PaymentRequest.js";
import crypto from "crypto";

import {
    createIncomingPayment,
    createQuote,
    requestOutgoingPaymentGrant,
    continueOutgoingPaymentGrant,
    createOutgoingPayment
} from "../services/openPaymentsService.js";
const normalizeWalletAddress = (walletAddress) => {

    const value =
        walletAddress.trim();


    if (value.startsWith("$")) {

        return `https://${value.slice(1)}`;

    }


    return value;

};

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



export const processOfferPayment = async (
    req,
    res
) => {

    try {

        // --------------------------------
        // 1. GET OFFER
        // --------------------------------

        const offer =
            await Offer.findById(
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


        // --------------------------------
        // 2. OFFER MUST BE ACCEPTED
        // --------------------------------

        if (offer.status !== "accepted") {

            return res.status(400).send(
                "Only accepted offers can be paid"
            );

        }


        // --------------------------------
        // 3. ONLY BUYER CAN PAY
        // --------------------------------

        if (
            offer.buyer._id.toString() !==
            req.session.shopId.toString()
        ) {

            return res.status(403).send(
                "You are not allowed to pay this offer"
            );

        }


        // --------------------------------
        // 4. CHECK EXISTING PAYMENT
        // --------------------------------

        let payment =
            await Payment.findOne({
                offer:
                    offer._id
            });


        if (
            payment &&
            payment.status === "successful"
        ) {

            return res.redirect(
                `/payments/${payment._id}/success`
            );

        }


        // --------------------------------
        // 5. VALIDATE WALLETS
        // --------------------------------

        if (!offer.buyer.walletAddress) {

            return res.status(400).send(
                "Your shop does not have an Open Payments wallet address"
            );

        }


        if (!offer.seller.walletAddress) {

            return res.status(400).send(
                "The seller does not have an Open Payments wallet address"
            );

        }


        const senderWalletAddress =
            normalizeWalletAddress(
                offer.buyer.walletAddress
            );


        const receiverWalletAddress =
            normalizeWalletAddress(
                offer.seller.walletAddress
            );


        if (
            !senderWalletAddress.startsWith(
                "https://"
            )
        ) {

            return res.status(400).send(
                "Buyer wallet address is invalid"
            );

        }


        if (
            !receiverWalletAddress.startsWith(
                "https://"
            )
        ) {

            return res.status(400).send(
                "Seller wallet address is invalid"
            );

        }


        // --------------------------------
        // 6. VALIDATE AMOUNT
        // --------------------------------

        const amount =
            Number(offer.amount);


        if (
            !Number.isFinite(amount) ||
            amount <= 0
        ) {

            return res.status(400).send(
                "Offer has an invalid payment amount"
            );

        }


        // --------------------------------
        // 7. CREATE/REUSE PAYMENT
        // --------------------------------

        if (!payment) {

            payment =
                await Payment.create({

                    offer:
                        offer._id,

                    tradeRequest:
                        offer.tradeRequest._id,

                    payer:
                        offer.buyer._id,

                    payee:
                        offer.seller._id,

                    amount,

                    currency:
                        "ZAR",

                    status:
                        "pending",

                    method:
                        "open_payments"

                });

        }


        console.log(
            "\nSTARTING NEXA VENDOR PAYMENT"
        );


        console.log(
            "Buyer:",
            senderWalletAddress
        );


        console.log(
            "Seller:",
            receiverWalletAddress
        );


        console.log(
            "Amount:",
            amount,
            "ZAR"
        );


        // --------------------------------
        // 8. CREATE SELLER INCOMING PAYMENT
        // --------------------------------

        const incomingResult =
            await createIncomingPayment({

                receiverWalletAddress,

                amount

            });


        console.log(
            "Vendor incoming payment created:",
            incomingResult.incomingPayment.id
        );


        // --------------------------------
        // 9. CREATE BUYER QUOTE
        // --------------------------------

        const quoteResult =
            await createQuote({

                senderWalletAddress,

                incomingPaymentUrl:
                    incomingResult
                        .incomingPayment
                        .id

            });


        console.log(
            "Vendor quote created:",
            quoteResult.quote.id
        );


        // --------------------------------
        // 10. REQUEST AUTHORIZATION
        // --------------------------------

        const nonce =
            crypto.randomUUID();


        const finishUri =
            `${req.protocol}://${req.get("host")}` +
            `/payments/offer/${offer._id}` +
            `/open-payments/callback`;


        const outgoingGrantResult =
            await requestOutgoingPaymentGrant({

                senderWalletAddress,

                quote:
                    quoteResult.quote,

                finishUri,

                nonce

            });


        const grant =
            outgoingGrantResult.grant;


        // --------------------------------
        // 11. SAVE TEMPORARY STATE
        // --------------------------------

        req.session.vendorOpenPayment = {

            paymentId:
                payment._id.toString(),

            offerId:
                offer._id.toString(),

            incomingPaymentUrl:
                incomingResult
                    .incomingPayment
                    .id,

            quoteUrl:
                quoteResult.quote.id,

            senderWalletAddress,

            continueUri:
                grant.continue.uri,

            continueAccessToken:
                grant.continue
                    .access_token
                    .value,

            nonce

        };


        // --------------------------------
        // 12. SAVE SESSION + REDIRECT
        // --------------------------------

        req.session.save(
            (error) => {

                if (error) {

                    console.error(
                        "VENDOR PAYMENT SESSION SAVE ERROR:",
                        error
                    );

                    return res.status(500).send(
                        "Unable to save payment session"
                    );

                }


                return res.redirect(
                    grant.interact.redirect
                );

            }
        );


    } catch (error) {

        console.error(
            "START VENDOR OPEN PAYMENT ERROR:"
        );

        console.error(error);


        return res.status(500).send(
            "Unable to start vendor Open Payments transaction"
        );

    }

};
export const finishOfferOpenPayment =
    async (req, res) => {

        try {

            console.log(
                "\nVENDOR RETURNED TO NEXA"
            );


            // --------------------------------
            // 1. GET TEMPORARY SESSION
            // --------------------------------

            const paymentSession =
                req.session.vendorOpenPayment;


            if (!paymentSession) {

                return res.status(400).send(
                    "Vendor payment session not found"
                );

            }


            if (
                paymentSession.offerId !==
                req.params.offerId
            ) {

                return res.status(400).send(
                    "Vendor payment session does not match offer"
                );

            }


            const interactRef =
                req.query.interact_ref;


            if (!interactRef) {

                return res.status(400).send(
                    "Missing interact_ref"
                );

            }


            // --------------------------------
            // 2. GET PAYMENT
            // --------------------------------

            const payment =
                await Payment.findById(
                    paymentSession.paymentId
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


            // --------------------------------
            // 3. SECURITY
            // --------------------------------

            if (
                payment.payer._id.toString() !==
                req.session.shopId?.toString()
            ) {

                return res.status(403).send(
                    "You cannot complete this payment"
                );

            }


            // --------------------------------
            // 4. DUPLICATE CALLBACK
            // --------------------------------

            if (
                payment.status === "successful"
            ) {

                console.log(
                    "VENDOR PAYMENT ALREADY COMPLETED:",
                    payment._id
                );


                delete req.session.vendorOpenPayment;


                return res.redirect(
                    `/payments/${payment._id}/success`
                );

            }


            // --------------------------------
            // 5. FINALIZE GRANT
            // --------------------------------

            const finalizedGrant =
                await continueOutgoingPaymentGrant({

                    continueUri:
                        paymentSession.continueUri,

                    continueAccessToken:
                        paymentSession
                            .continueAccessToken,

                    interactRef

                });


            console.log(
                "Vendor outgoing grant finalized"
            );


            // --------------------------------
            // 6. EXECUTE PAYMENT
            // --------------------------------

            const outgoingPayment =
                await createOutgoingPayment({

                    senderWalletAddress:
                        paymentSession
                            .senderWalletAddress,

                    quoteUrl:
                        paymentSession.quoteUrl,

                    outgoingAccessToken:
                        finalizedGrant
                            .access_token
                            .value

                });


            console.log(
                "Vendor outgoing payment created:",
                outgoingPayment.id
            );


            console.log(
                "Sent:",
                outgoingPayment.sentAmount
            );


            console.log(
                "Received:",
                outgoingPayment.receiveAmount
            );


            console.log(
                "Failed:",
                outgoingPayment.failed
            );


            // --------------------------------
            // 7. HANDLE FAILED PAYMENT
            // --------------------------------

            if (outgoingPayment.failed) {

                payment.status =
                    "failed";


                await payment.save();


                delete req.session.vendorOpenPayment;


                return res.status(400).send(
                    "Open Payments transaction failed"
                );

            }


            // --------------------------------
            // 8. MARK PAYMENT SUCCESSFUL
            // --------------------------------

            payment.status =
                "successful";


            payment.method =
                "open_payments";


            payment.providerTransactionId =
                outgoingPayment.id;


            payment.completedAt =
                new Date();


            await payment.save();


            // --------------------------------
            // 9. CREATE TRANSACTION ONCE
            // --------------------------------

            let transaction =
                await Transaction.findOne({

                    payment:
                        payment._id

                });


            if (!transaction) {

                const reference =
                    `NEXA-${Date.now()}-${payment._id
                        .toString()
                        .slice(-6)
                        .toUpperCase()}`;


                transaction =
                    await Transaction.create({

                        payment:
                            payment._id,

                        offer:
                            payment.offer._id,

                        tradeRequest:
                            payment.tradeRequest._id,

                        fromShop:
                            payment.payer._id,

                        toShop:
                            payment.payee._id,

                        amount:
                            payment.amount,

                        currency:
                            payment.currency,

                        type:
                            "trade_payment",

                        status:
                            "successful",

                        reference,

                        providerTransactionId:
                            outgoingPayment.id

                    });


                console.log(
                    "VENDOR TRANSACTION CREATED:",
                    transaction._id
                );

            } else {

                console.log(
                    "VENDOR TRANSACTION ALREADY EXISTS:",
                    transaction._id
                );

            }


            // --------------------------------
            // 10. NOTIFY SELLER ONCE
            // --------------------------------

            if (payment.payee?.owner) {

                const existingNotification =
                    await Notification.findOne({

                        type:
                            "payment_received",

                        relatedTransaction:
                            transaction._id

                    });


                if (!existingNotification) {

                    await Notification.create({

                        user:
                            payment.payee.owner,

                        type:
                            "payment_received",

                        message:
                            `Payment of R${Number(payment.amount).toFixed(2)} received for ${payment.tradeRequest.product}`,

                        relatedTrade:
                            payment.tradeRequest._id,

                        relatedOffer:
                            payment.offer._id,

                        relatedShop:
                            payment.payer._id,

                        relatedPayment:
                            payment._id,

                        relatedTransaction:
                            transaction._id

                    });


                    console.log(
                        "SELLER PAYMENT NOTIFICATION CREATED"
                    );

                }

            }


            // --------------------------------
            // 11. CLEAR TEMPORARY SESSION
            // --------------------------------

            delete req.session.vendorOpenPayment;


            // --------------------------------
            // 12. SUCCESS
            // --------------------------------

            return res.redirect(
                `/payments/${payment._id}/success`
            );


        } catch (error) {

            console.error(
                "FINISH VENDOR OPEN PAYMENT ERROR:"
            );

            console.error(error);


            return res.status(500).send(
                "Unable to complete vendor Open Payments transaction"
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

export const showSendMoney = async (req, res) => {

    try {

        const currentShop =
            await Shop.findById(
                req.session.shopId
            );

        if (!currentShop) {

            return res.status(404).send(
                "Shop not found"
            );

        }


        return res.render(
            "payments/send-money",
            {
                currentShop
            }
        );


    } catch (error) {

        console.error(
            "SHOW SEND MONEY ERROR:",
            error
        );

        return res.status(500).send(
            "Unable to load send money page"
        );

    }

};

export const showReceiveMoney = async (req, res) => {

    try {

        const currentShop =
            await Shop.findById(
                req.session.shopId
            );


        if (!currentShop) {

            return res.status(404).send(
                "Shop not found"
            );

        }


        return res.render(
            "payments/receive",
            {
                currentShop
            }
        );


    } catch (error) {

        console.error(
            "SHOW RECEIVE MONEY ERROR:",
            error
        );

        return res.status(500).send(
            "Unable to load receive money page"
        );

    }

};
export const createPaymentRequest = async (
    req,
    res
) => {

    try {

        const currentShop =
            await Shop.findById(
                req.session.shopId
            );


        if (!currentShop) {

            return res.status(404).send(
                "Shop not found"
            );

        }


        if (!currentShop.walletAddress) {

            return res.status(400).send(
                "This shop does not have a wallet address"
            );

        }


        const {
            amount,
            reference
        } = req.body;


        if (
            !amount ||
            Number(amount) <= 0
        ) {

            return res.status(400).send(
                "Enter a valid payment amount"
            );

        }


        if (
            !reference ||
            reference.trim() === ""
        ) {

            return res.status(400).send(
                "Reference is required"
            );

        }


        const expiresAt =
            new Date(
                Date.now() +
                30 * 60 * 1000
            );


        const paymentRequest =
            await PaymentRequest.create({

                shop:
                    currentShop._id,

                walletAddress:
                    currentShop.walletAddress,

                amount:
                    Number(amount),

                currency:
                    "ZAR",

                reference:
                    reference.trim(),

                expiresAt

            });


        return res.redirect(
            `/payments/receive/${paymentRequest._id}`
        );


    } catch (error) {

        console.error(
            "CREATE PAYMENT REQUEST ERROR:",
            error
        );

        return res.status(500).send(
            "Unable to create payment request"
        );

    }

};
export const showGeneratedPaymentRequest =
    async (req, res) => {

        try {

            const paymentRequest =
                await PaymentRequest.findById(
                    req.params.paymentRequestId
                )
                    .populate("shop");


            if (!paymentRequest) {

                return res.status(404).send(
                    "Payment request not found"
                );

            }


            if (
                paymentRequest.shop._id
                    .toString() !==
                req.session.shopId.toString()
            ) {

                return res.status(403).send(
                    "You cannot view this payment request"
                );

            }


            const paymentUrl =
                `${req.protocol}://${req.get("host")}` +
                `/pay/${paymentRequest._id}`;


            const qrCode =
                await QRCode.toDataURL(
                    paymentUrl
                );


            return res.render(
                "payments/payment-request",
                {
                    paymentRequest,
                    paymentUrl,
                    qrCode
                }
            );


        } catch (error) {

            console.error(
                "SHOW PAYMENT REQUEST ERROR:",
                error
            );

            return res.status(500).send(
                "Unable to load payment request"
            );

        }

    };
export const showCustomerPayment =
    async (req, res) => {

        try {

            const paymentRequest =
                await PaymentRequest.findById(
                    req.params.paymentRequestId
                )
                    .populate("shop");


            if (!paymentRequest) {

                return res.status(404).send(
                    "Payment request not found"
                );

            }


            if (
                paymentRequest.status !==
                "pending"
            ) {

                return res.status(400).send(
                    "This payment request is no longer active"
                );

            }


            if (
                paymentRequest.expiresAt &&
                new Date() >
                paymentRequest.expiresAt
            ) {

                paymentRequest.status =
                    "expired";

                await paymentRequest.save();


                return res.status(400).send(
                    "This payment request has expired"
                );

            }


            return res.render(
                "payments/customer-pay",
                {
                    paymentRequest
                }
            );


        } catch (error) {

            console.error(
                "CUSTOMER PAYMENT ERROR:",
                error
            );

            return res.status(500).send(
                "Unable to load payment request"
            );

        }

    };
export const startCustomerOpenPayment =
    async (req, res) => {

        try {

            const paymentRequest =
                await PaymentRequest.findById(
                    req.params.paymentRequestId
                )
                    .populate("shop");


            if (!paymentRequest) {

                return res.status(404).send(
                    "Payment request not found"
                );

            }


            if (
                paymentRequest.status !==
                "pending"
            ) {

                return res.status(400).send(
                    "This payment request is no longer active"
                );

            }


            if (
                paymentRequest.expiresAt &&
                new Date() >
                paymentRequest.expiresAt
            ) {

                paymentRequest.status =
                    "expired";

                await paymentRequest.save();


                return res.status(400).send(
                    "This payment request has expired"
                );

            }


            // --------------------------------
            // PAYER WALLET
            // --------------------------------

            const payerWalletAddress =
                normalizeWalletAddress(
                    req.body.payerWalletAddress
                );
            const receiverWalletAddress =
                normalizeWalletAddress(
                    paymentRequest.walletAddress
                );

            if (
                !payerWalletAddress.startsWith(
                    "https://"
                )
            ) {

                return res.status(400).send(
                    "Enter a valid Open Payments wallet address"
                );

            }


            console.log(
                "\nSTARTING NEXA CUSTOMER PAYMENT"
            );

            console.log(
                "Payer:",
                payerWalletAddress
            );

            console.log(
                "Recipient:",
                receiverWalletAddress
            );
            console.log(
                "Amount:",
                paymentRequest.amount,
                paymentRequest.currency
            );


            // --------------------------------
            // 1. RECIPIENT INCOMING PAYMENT
            // --------------------------------

            const incomingResult =
                await createIncomingPayment({

                    receiverWalletAddress:
                        receiverWalletAddress,

                    amount:
                        paymentRequest.amount

                });


            console.log(
                "Incoming payment created:",
                incomingResult.incomingPayment.id
            );


            // --------------------------------
            // 2. PAYER QUOTE
            // --------------------------------

            const quoteResult =
                await createQuote({

                    senderWalletAddress:
                        payerWalletAddress,

                    incomingPaymentUrl:
                        incomingResult
                            .incomingPayment
                            .id

                });


            console.log(
                "Quote created:",
                quoteResult.quote.id
            );


            // --------------------------------
            // 3. INTERACTIVE AUTHORIZATION
            // --------------------------------

            const nonce =
                crypto.randomUUID();


            const finishUri =
                `${req.protocol}://${req.get("host")}` +
                `/pay/${paymentRequest._id}` +
                `/open-payments/callback`;


            const outgoingGrantResult =
                await requestOutgoingPaymentGrant({

                    senderWalletAddress:
                        payerWalletAddress,

                    quote:
                        quoteResult.quote,

                    finishUri,

                    nonce

                });


            const grant =
                outgoingGrantResult.grant;


            // --------------------------------
            // 4. SAVE TEMPORARY PAYMENT STATE
            // --------------------------------

            req.session.customerOpenPayment = {

                paymentRequestId:
                    paymentRequest._id.toString(),

                incomingPaymentUrl:
                    incomingResult
                        .incomingPayment
                        .id,

                quoteUrl:
                    quoteResult.quote.id,

                senderWalletAddress:
                    payerWalletAddress,

                continueUri:
                    grant.continue.uri,

                continueAccessToken:
                    grant.continue
                        .access_token
                        .value,

                nonce

            };


            // Save BEFORE redirecting away.

            req.session.save(
                (error) => {

                    if (error) {

                        console.error(
                            "PAYMENT SESSION SAVE ERROR:",
                            error
                        );

                        return res.status(500).send(
                            "Unable to save payment session"
                        );

                    }


                    return res.redirect(
                        grant.interact.redirect
                    );

                }
            );


        } catch (error) {

            console.error(
                "START CUSTOMER OPEN PAYMENT ERROR:"
            );

            console.error(error);


            return res.status(500).send(
                "Unable to start Open Payments transaction"
            );

        }

    };
export const finishCustomerOpenPayment =
    async (req, res) => {

        try {

            console.log(
                "\nCUSTOMER RETURNED TO NEXA"
            );
            console.log(
                "CALLBACK QUERY:",
                req.query
            );

            console.log(
                "CALLBACK URL:",
                req.originalUrl
            );

            // --------------------------------
            // 1. GET PAYMENT SESSION
            // --------------------------------

            const paymentSession =
                req.session.customerOpenPayment;


            if (!paymentSession) {

                return res.status(400).send(
                    "Payment session not found"
                );

            }


            if (
                paymentSession.paymentRequestId !==
                req.params.paymentRequestId
            ) {

                return res.status(400).send(
                    "Payment session does not match request"
                );

            }


            const interactRef =
                req.query.interact_ref;


            if (!interactRef) {

                return res.status(400).send(
                    "Missing interact_ref"
                );

            }


            // --------------------------------
            // 2. DUPLICATE PAYMENT PROTECTION
            // --------------------------------

            const existingPaymentRequest =
                await PaymentRequest.findById(
                    paymentSession.paymentRequestId
                )
                    .populate("shop");


            if (!existingPaymentRequest) {

                return res.status(404).send(
                    "Payment request not found"
                );

            }


            // If already paid, do NOT attempt
            // another Open Payments transfer.

            if (
                existingPaymentRequest.status ===
                "paid"
            ) {

                console.log(
                    "PAYMENT ALREADY COMPLETED:",
                    existingPaymentRequest._id
                );


                const existingTransaction =
                    await Transaction.findOne({

                        paymentRequest:
                            existingPaymentRequest._id

                    });


                delete req.session.customerOpenPayment;


                return res.render(
                    "payments/customer-success",
                    {
                        paymentRequest:
                            existingPaymentRequest,

                        outgoingPayment:
                            existingTransaction
                                ? {
                                    id:
                                        existingTransaction
                                            .providerTransactionId
                                }
                                : null
                    }
                );

            }


            // --------------------------------
            // 3. FINALIZE AUTHORIZATION
            // --------------------------------

            const finalizedGrant =
                await continueOutgoingPaymentGrant({

                    continueUri:
                        paymentSession.continueUri,

                    continueAccessToken:
                        paymentSession
                            .continueAccessToken,

                    interactRef

                });


            console.log(
                "Outgoing grant finalized"
            );


            // --------------------------------
            // 4. EXECUTE OPEN PAYMENT
            // --------------------------------

            const outgoingPayment =
                await createOutgoingPayment({

                    senderWalletAddress:
                        paymentSession
                            .senderWalletAddress,

                    quoteUrl:
                        paymentSession.quoteUrl,

                    outgoingAccessToken:
                        finalizedGrant
                            .access_token
                            .value

                });


            console.log(
                "Outgoing payment created:",
                outgoingPayment.id
            );


            console.log(
                "Sent:",
                outgoingPayment.sentAmount
            );


            console.log(
                "Received:",
                outgoingPayment.receiveAmount
            );


            console.log(
                "Failed:",
                outgoingPayment.failed
            );


            // --------------------------------
            // 5. CHECK PAYMENT RESULT
            // --------------------------------

            if (outgoingPayment.failed) {

                return res.status(400).send(
                    "Open Payments transaction failed"
                );

            }


            // --------------------------------
            // 6. GET PAYMENT REQUEST
            // --------------------------------

            const paymentRequest =
                await PaymentRequest.findById(
                    paymentSession.paymentRequestId
                )
                    .populate("shop");


            if (!paymentRequest) {

                return res.status(404).send(
                    "Payment request not found"
                );

            }


            // --------------------------------
            // 7. MARK REQUEST AS PAID
            // --------------------------------

            paymentRequest.status =
                "paid";


            await paymentRequest.save();


            console.log(
                "PAYMENT REQUEST MARKED AS PAID"
            );


            // --------------------------------
            // 8. CREATE NEXA TRANSACTION
            // --------------------------------

            let transaction =
                await Transaction.findOne({

                    paymentRequest:
                        paymentRequest._id

                });


            if (!transaction) {

                transaction =
                    await Transaction.create({

                        paymentRequest:
                            paymentRequest._id,

                        toShop:
                            paymentRequest.shop._id,

                        amount:
                            paymentRequest.amount,

                        currency:
                            paymentRequest.currency,

                        type:
                            "customer_payment",

                        status:
                            "successful",

                        reference:
                            paymentRequest.reference,

                        providerTransactionId:
                            outgoingPayment.id

                    });


                console.log(
                    "CUSTOMER TRANSACTION CREATED:",
                    transaction._id
                );

            } else {

                console.log(
                    "CUSTOMER TRANSACTION ALREADY EXISTS:",
                    transaction._id
                );

            }


            // --------------------------------
            // 9. NOTIFY VENDOR
            // --------------------------------

            const vendorShop =
                paymentRequest.shop;


            if (vendorShop?.owner) {

                const existingNotification =
                    await Notification.findOne({

                        type:
                            "payment_received",

                        relatedTransaction:
                            transaction._id

                    });


                if (!existingNotification) {

                    await Notification.create({

                        user:
                            vendorShop.owner,

                        type:
                            "payment_received",

                        message:
                            `R${Number(paymentRequest.amount).toFixed(2)} received via Open Payments`,

                        relatedShop:
                            vendorShop._id,

                        relatedTransaction:
                            transaction._id

                    });


                    console.log(
                        "VENDOR PAYMENT NOTIFICATION CREATED"
                    );

                } else {

                    console.log(
                        "PAYMENT NOTIFICATION ALREADY EXISTS"
                    );

                }

            }


            // --------------------------------
            // 10. CLEAR TEMPORARY SESSION
            // --------------------------------

            delete req.session.customerOpenPayment;


            // --------------------------------
            // 11. SHOW SUCCESS PAGE
            // --------------------------------

            return res.render(
                "payments/customer-success",
                {
                    paymentRequest,
                    outgoingPayment
                }
            );


        } catch (error) {

            console.error(
                "FINISH CUSTOMER OPEN PAYMENT ERROR:"
            );

            console.error(error);


            return res.status(500).send(
                "Unable to complete Open Payments transaction"
            );

        }

    };
export const getPaymentRequestStatus =
    async (req, res) => {

        try {

            const paymentRequest =
                await PaymentRequest.findById(
                    req.params.paymentRequestId
                );


            if (!paymentRequest) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Payment request not found"
                });

            }


            // --------------------------------
            // SECURITY
            // Only the shop that created the
            // request can monitor it.
            // --------------------------------

            if (
                paymentRequest.shop.toString() !==
                req.session.shopId?.toString()
            ) {

                return res.status(403).json({
                    success: false,
                    message:
                        "Not authorized"
                });

            }


            // --------------------------------
            // FIND TRANSACTION IF PAID
            // --------------------------------

            let transactionId =
                null;


            if (
                paymentRequest.status ===
                "paid"
            ) {

                const transaction =
                    await Transaction.findOne({
                        paymentRequest:
                            paymentRequest._id
                    });


                if (transaction) {

                    transactionId =
                        transaction._id;

                }

            }


            return res.json({

                success: true,

                status:
                    paymentRequest.status,

                amount:
                    paymentRequest.amount,

                currency:
                    paymentRequest.currency,

                transactionId

            });


        } catch (error) {

            console.error(
                "PAYMENT STATUS ERROR:",
                error
            );


            return res.status(500).json({
                success: false,
                message:
                    "Unable to check payment status"
            });

        }

    };