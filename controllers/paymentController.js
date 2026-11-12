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

const getPublicBaseUrl = (req) => {
    const configuredUrl = String(process.env.PUBLIC_BASE_URL || "").trim();

    if (configuredUrl) {
        const parsedUrl = new URL(configuredUrl);

        if (parsedUrl.protocol !== "https:" && process.env.NODE_ENV === "production") {
            throw new Error("PUBLIC_BASE_URL must use HTTPS in production");
        }

        return parsedUrl.origin;
    }

    return `${req.protocol}://${req.get("host")}`;
};

const normalizeWalletAddress = (walletAddress) => {
    const value = String(walletAddress || "").trim();

    if (value.startsWith("$")) {
        return `https://${value.slice(1)}`;
    }

    return value;
};

const validWallet = (walletAddress) => {
    try {
        const url = new URL(walletAddress);

        return (
            url.protocol === "https:" &&
            Boolean(url.hostname) &&
            !url.username &&
            !url.password &&
            !url.hash
        );
    } catch {
        return false;
    }
};

const validAmount = (amount) => {
    const value = Number(amount);

    return (
        String(amount ?? "").trim() !== "" &&
        Number.isFinite(value) &&
        value > 0 &&
        Number.isSafeInteger(Math.round(value * 100)) &&
        Math.abs(value * 100 - Math.round(value * 100)) < 0.000001
    );
};

const renderError = (res, statusCode, message) => {
    return res.status(statusCode).render("public/error", {
        statusCode,
        message
    });
};

const sendMoneyError = (res, message) => {
    return res.redirect(
        `/payments/send?error=${encodeURIComponent(message)}`
    );
};

const paymentError = (error, fallback) => {
    console.error(fallback, error);

    return fallback;
};

const saveSession = (req) => {
    return new Promise((resolve, reject) => {
        req.session.save((error) => {
            if (error) {
                return reject(error);
            }

            resolve();
        });
    });
};

const clearPaymentSession = async (req, key) => {
    delete req.session[key];
    await saveSession(req);
};

const reserveCallback = async (req, key) => {
    const state = req.session[key];

    if (!state || state.processing) {
        return false;
    }

    state.processing = true;
    req.session[key] = state;

    await saveSession(req);

    return true;
};

const notifyOnce = async (transaction, data) => {
    if (!data.user) {
        return;
    }

    const existing = await Notification.findOne({
        type: "payment_received",
        relatedTransaction: transaction._id
    });

    if (existing) {
        return;
    }

    await Notification.create({
        ...data,
        type: "payment_received",
        relatedTransaction: transaction._id
    });
};

const startOpenPayment = async ({
    req,
    senderWalletAddress,
    receiverWalletAddress,
    amount,
    finishUri,
    sessionKey,
    sessionData
}) => {
    const incomingResult = await createIncomingPayment({
        receiverWalletAddress,
        amount
    });

    const quoteResult = await createQuote({
        senderWalletAddress,
        incomingPaymentUrl: incomingResult.incomingPayment.id
    });

    const nonce = crypto.randomUUID();

    const grantResult = await requestOutgoingPaymentGrant({
        senderWalletAddress,
        quote: quoteResult.quote,
        finishUri,
        nonce
    });

    const grant = grantResult.grant;

    if (
        !grant?.continue?.uri ||
        !grant?.continue?.access_token?.value ||
        !grant?.interact?.redirect
    ) {
        throw new Error("Invalid Open Payments authorization response");
    }

    req.session[sessionKey] = {
        ...sessionData,
        senderWalletAddress,
        receiverWalletAddress,
        quoteUrl: quoteResult.quote.id,
        incomingPaymentUrl: incomingResult.incomingPayment.id,
        continueUri: grant.continue.uri,
        continueAccessToken: grant.continue.access_token.value,
        nonce,
        processing: false
    };

    await saveSession(req);

    return grant.interact.redirect;
};

const executeOpenPayment = async (state, interactRef) => {
    const grant = await continueOutgoingPaymentGrant({
        continueUri: state.continueUri,
        continueAccessToken: state.continueAccessToken,
        interactRef
    });

    return createOutgoingPayment({
        senderWalletAddress: state.senderWalletAddress,
        quoteUrl: state.quoteUrl,
        outgoingAccessToken: grant.access_token.value
    });
};

export const showOfferPayment = async (req, res) => {
    try {
        const offer = await Offer.findById(req.params.offerId)
            .populate("buyer")
            .populate("seller")
            .populate("tradeRequest");

        if (!offer) {
            return renderError(res, 404, "Offer not found");
        }

        if (
            !offer.buyer ||
            offer.buyer._id.toString() !== String(req.session.shopId)
        ) {
            return renderError(res, 403, "Only the buyer can pay for this offer");
        }

        if (
            offer.status !== "accepted" ||
            offer.tradeRequest?.status !== "accepted"
        ) {
            return renderError(
                res,
                400,
                "This trade is no longer available for payment"
            );
        }

        const existingPayment = await Payment.findOne({
            offer: offer._id,
            status: "successful"
        });

        if (existingPayment) {
            return res.redirect(
                `/payments/${existingPayment._id}/success`
            );
        }

        return res.render("payments/send", { offer });
    } catch (error) {
        paymentError(error, "SHOW OFFER PAYMENT ERROR");

        return renderError(res, 500, "Unable to load payment");
    }
};

export const processOfferPayment = async (req, res) => {
    try {
        const offer = await Offer.findById(req.params.offerId)
            .populate("buyer")
            .populate("seller")
            .populate("tradeRequest");

        if (!offer) {
            return renderError(res, 404, "Offer not found");
        }

        if (
            !offer.buyer ||
            offer.buyer._id.toString() !== String(req.session.shopId)
        ) {
            return renderError(res, 403, "You cannot pay this offer");
        }

        if (
            offer.status !== "accepted" ||
            offer.tradeRequest?.status !== "accepted"
        ) {
            return renderError(
                res,
                400,
                "This offer is no longer available for payment"
            );
        }

        if (!offer.seller) {
            return renderError(res, 404, "Seller not found");
        }

        const senderWalletAddress = normalizeWalletAddress(
            offer.buyer.walletAddress
        );

        const receiverWalletAddress = normalizeWalletAddress(
            offer.seller.walletAddress
        );

        if (!validWallet(senderWalletAddress)) {
            return renderError(
                res,
                400,
                "Your shop needs a valid Open Payments wallet address"
            );
        }

        if (!validWallet(receiverWalletAddress)) {
            return renderError(
                res,
                400,
                "The seller needs a valid Open Payments wallet address"
            );
        }

        if (!validAmount(offer.amount)) {
            return renderError(res, 400, "Invalid offer payment amount");
        }

        let payment = await Payment.findOne({
            offer: offer._id
        });

        if (payment?.status === "successful") {
            return res.redirect(
                `/payments/${payment._id}/success`
            );
        }

        if (payment?.status === "failed") {
            return renderError(
                res,
                409,
                "This payment previously failed. Its status must be reviewed before another attempt."
            );
        }

        if (payment?.providerTransactionId) {
            return renderError(
                res,
                409,
                "This payment has already been submitted to the provider"
            );
        }

        if (payment) {
            return renderError(
                res,
                409,
                "An existing payment attempt needs to be reviewed before starting another"
            );
        }

        if (req.session.vendorOpenPayment) {
            return renderError(
                res,
                409,
                "You already have a vendor payment authorization in progress"
            );
        }

        payment = await Payment.create({
            offer: offer._id,
            tradeRequest: offer.tradeRequest._id,
            payer: offer.buyer._id,
            payee: offer.seller._id,
            amount: Number(offer.amount),
            currency: "ZAR",
            status: "pending",
            method: "open_payments"
        });

        const finishUri =
            `${getPublicBaseUrl(req)}` +
            `/payments/offer/${offer._id}/open-payments/callback`;

        const redirectUrl = await startOpenPayment({
            req,
            senderWalletAddress,
            receiverWalletAddress,
            amount: Number(offer.amount),
            finishUri,
            sessionKey: "vendorOpenPayment",
            sessionData: {
                paymentId: payment._id.toString(),
                offerId: offer._id.toString()
            }
        });

        return res.redirect(redirectUrl);
    } catch (error) {
        paymentError(error, "PROCESS OFFER PAYMENT ERROR");

        return renderError(
            res,
            502,
            "Unable to start the vendor payment. Check the payment status before retrying."
        );
    }
};

export const finishOfferOpenPayment = async (req, res) => {
    try {
        const state = req.session.vendorOpenPayment;

        if (!state) {
            return renderError(res, 400, "Vendor payment session not found");
        }

        if (state.offerId !== req.params.offerId) {
            return renderError(res, 403, "Payment session does not match this offer");
        }

        const payment = await Payment.findById(state.paymentId)
            .populate("payer")
            .populate("payee")
            .populate("tradeRequest")
            .populate("offer");

        if (!payment) {
            return renderError(res, 404, "Payment not found");
        }

        if (
            payment.payer?._id.toString() !== String(req.session.shopId)
        ) {
            return renderError(res, 403, "You cannot complete this payment");
        }

        if (payment.status === "successful") {
            await clearPaymentSession(req, "vendorOpenPayment");

            return res.redirect(
                `/payments/${payment._id}/success`
            );
        }

        if (!req.query.interact_ref) {
            if (state.processing) {
                return renderError(
                    res,
                    409,
                    "Payment processing may already have started. Check its status."
                );
            }

            await clearPaymentSession(req, "vendorOpenPayment");

            return res.redirect(
                `/payments/offer/${req.params.offerId}`
            );
        }

        if (!(await reserveCallback(req, "vendorOpenPayment"))) {
            return renderError(
                res,
                409,
                "This payment is already processing or requires a status check"
            );
        }

        const outgoingPayment = await executeOpenPayment(
            state,
            req.query.interact_ref
        );

        if (outgoingPayment.failed === true) {
            payment.status = "failed";
            await payment.save();

            await clearPaymentSession(req, "vendorOpenPayment");

            return renderError(
                res,
                400,
                "The payment provider reported that this transaction failed"
            );
        }

        if (!outgoingPayment.id) {
            return renderError(
                res,
                502,
                "The provider returned an incomplete payment result. Do not retry until the status is checked."
            );
        }

        payment.status = "successful";
        payment.method = "open_payments";
        payment.providerTransactionId = outgoingPayment.id;
        payment.completedAt = new Date();

        await payment.save();

        let transaction = await Transaction.findOne({
            payment: payment._id
        });

        if (!transaction) {
            transaction = await Transaction.create({
                payment: payment._id,
                offer: payment.offer._id,
                tradeRequest: payment.tradeRequest._id,
                fromShop: payment.payer._id,
                toShop: payment.payee._id,
                amount: payment.amount,
                currency: payment.currency,
                type: "trade_payment",
                status: "successful",
                reference: `NEXA-${payment._id.toString().slice(-10).toUpperCase()}`,
                providerTransactionId: outgoingPayment.id
            });
        }

        try {
            await notifyOnce(transaction, {
                user: payment.payee.owner,
                message: `Payment of R${Number(payment.amount).toFixed(2)} received for ${payment.tradeRequest.product}`,
                relatedTrade: payment.tradeRequest._id,
                relatedOffer: payment.offer._id,
                relatedShop: payment.payer._id,
                relatedPayment: payment._id
            });
        } catch (notificationError) {
            console.error("VENDOR PAYMENT NOTIFICATION ERROR:", notificationError);
        }

        await clearPaymentSession(req, "vendorOpenPayment");

        return res.redirect(
            `/payments/${payment._id}/success`
        );
    } catch (error) {
        paymentError(error, "FINISH VENDOR PAYMENT ERROR");

        return renderError(
            res,
            502,
            "The payment outcome requires verification. Do not start another payment until it is checked."
        );
    }
};

export const showPaymentSuccess = async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.paymentId)
            .populate("payer")
            .populate("payee")
            .populate("tradeRequest")
            .populate("offer");

        if (!payment) {
            return renderError(res, 404, "Payment not found");
        }

        const shopId = String(req.session.shopId);

        if (
            payment.payer?._id.toString() !== shopId &&
            payment.payee?._id.toString() !== shopId
        ) {
            return renderError(res, 403, "You cannot view this payment");
        }

        if (payment.status !== "successful") {
            return renderError(
                res,
                409,
                "This payment has not been confirmed as successful"
            );
        }

        const transaction = await Transaction.findOne({
            payment: payment._id
        });

        return res.render("payments/success", {
            payment,
            transaction
        });
    } catch (error) {
        paymentError(error, "SHOW PAYMENT SUCCESS ERROR");

        return renderError(res, 500, "Unable to load payment");
    }
};

export const showPayments = async (req, res) => {
    try {
        const currentShopId = req.session.shopId;

        const recentTransactions = await Transaction.find({
            $or: [
                { fromShop: currentShopId },
                { toShop: currentShopId }
            ]
        })
            .populate("fromShop")
            .populate("toShop")
            .populate("tradeRequest")
            .sort({ createdAt: -1 })
            .limit(5);

        return res.render("payments/index", {
            recentTransactions,
            currentShopId
        });
    } catch (error) {
        paymentError(error, "SHOW PAYMENTS ERROR");

        return renderError(res, 500, "Unable to load payments");
    }
};

export const showSendMoney = async (req, res) => {
    try {
        const currentShop = await Shop.findById(req.session.shopId);

        if (!currentShop) {
            return renderError(res, 404, "Shop not found");
        }

        return res.render("payments/send-money", {
            currentShop
        });
    } catch (error) {
        paymentError(error, "SHOW SEND MONEY ERROR");

        return renderError(res, 500, "Unable to load Send Money");
    }
};

export const processSendMoney = async (req, res) => {
    try {
        const currentShop = await Shop.findById(req.session.shopId);

        if (!currentShop) {
            return renderError(res, 404, "Shop not found");
        }

        if (req.session.directOpenPayment) {
            return sendMoneyError(
                res,
                "A previous payment is still pending or requires verification"
            );
        }

        const senderWalletAddress = normalizeWalletAddress(
            currentShop.walletAddress
        );

        const receiverWalletAddress = normalizeWalletAddress(
            req.body.walletAddress
        );

        const amount = req.body.amount;
        const reference = String(req.body.reference || "").trim();

        if (!validWallet(senderWalletAddress)) {
            return sendMoneyError(
                res,
                "Add a valid Open Payments wallet to your shop settings"
            );
        }

        if (!validWallet(receiverWalletAddress)) {
            return sendMoneyError(
                res,
                "Enter a valid recipient wallet address"
            );
        }

        if (!validAmount(amount)) {
            return sendMoneyError(
                res,
                "Enter a valid amount with no more than two decimal places"
            );
        }

        if (!reference) {
            return sendMoneyError(res, "Payment reference is required");
        }

        if (reference.length > 120) {
            return sendMoneyError(
                res,
                "Payment reference cannot exceed 120 characters"
            );
        }

        const shops = await Shop.find({
            walletAddress: {
                $exists: true,
                $ne: null
            }
        });

        const recipientShop = shops.find((shop) => {
            return normalizeWalletAddress(
                shop.walletAddress
            ) === receiverWalletAddress;
        });

        if (!recipientShop) {
            return sendMoneyError(
                res,
                "No NEXA shop uses this wallet address"
            );
        }

        if (
            recipientShop._id.toString() ===
            currentShop._id.toString()
        ) {
            return sendMoneyError(
                res,
                "You cannot send money to your own shop"
            );
        }

        const finishUri =
            `${getPublicBaseUrl(req)}` +
            "/payments/send/open-payments/callback";

        const redirectUrl = await startOpenPayment({
            req,
            senderWalletAddress,
            receiverWalletAddress,
            amount: Number(amount),
            finishUri,
            sessionKey: "directOpenPayment",
            sessionData: {
                senderShopId: currentShop._id.toString(),
                recipientShopId: recipientShop._id.toString(),
                amount: Number(amount),
                reference
            }
        });

        return res.redirect(redirectUrl);
    } catch (error) {
        paymentError(error, "START DIRECT PAYMENT ERROR");

        return renderError(
            res,
            502,
            "Unable to start the payment. Please check your wallet connection."
        );
    }
};

export const finishSendMoney = async (req, res) => {
    try {
        const state = req.session.directOpenPayment;

        if (!state) {
            return renderError(
                res,
                400,
                "Payment session not found or already completed"
            );
        }

        if (
            state.senderShopId !== String(req.session.shopId)
        ) {
            return renderError(
                res,
                403,
                "You cannot complete this payment"
            );
        }

        if (!req.query.interact_ref) {
            if (state.processing) {
                return renderError(
                    res,
                    409,
                    "Payment status requires verification"
                );
            }

            await clearPaymentSession(req, "directOpenPayment");

            return sendMoneyError(
                res,
                "Payment authorization was cancelled"
            );
        }

        if (!(await reserveCallback(req, "directOpenPayment"))) {
            return renderError(
                res,
                409,
                "This payment is already processing or requires verification"
            );
        }

        const senderShop = await Shop.findById(state.senderShopId);
        const recipientShop = await Shop.findById(state.recipientShopId);

        if (!senderShop || !recipientShop) {
            return renderError(
                res,
                404,
                "Sender or recipient shop no longer exists"
            );
        }

        const outgoingPayment = await executeOpenPayment(
            state,
            req.query.interact_ref
        );

        if (outgoingPayment.failed === true) {
            await clearPaymentSession(req, "directOpenPayment");

            return renderError(
                res,
                400,
                "The payment provider reported that the transaction failed"
            );
        }

        if (!outgoingPayment.id) {
            return renderError(
                res,
                502,
                "The provider returned an incomplete payment result. Do not retry until the status is checked."
            );
        }

        let transaction = await Transaction.findOne({
            providerTransactionId: outgoingPayment.id
        });

        if (!transaction) {
            transaction = await Transaction.create({
                fromShop: senderShop._id,
                toShop: recipientShop._id,
                amount: state.amount,
                currency: "ZAR",
                type: "direct_payment",
                status: "successful",
                reference: state.reference,
                providerTransactionId: outgoingPayment.id
            });
        }

        try {
            await notifyOnce(transaction, {
                user: recipientShop.owner,
                message: `R${Number(state.amount).toFixed(2)} received from ${senderShop.name}`,
                relatedShop: senderShop._id
            });
        } catch (notificationError) {
            console.error("DIRECT PAYMENT NOTIFICATION ERROR:", notificationError);
        }

        await clearPaymentSession(req, "directOpenPayment");

        return res.redirect(
            `/transactions/${transaction._id}`
        );
    } catch (error) {
        paymentError(error, "FINISH DIRECT PAYMENT ERROR");

        return renderError(
            res,
            502,
            "The payment outcome is uncertain. Check the transaction before attempting another transfer."
        );
    }
};

export const showReceiveMoney = async (req, res) => {
    try {
        const currentShop = await Shop.findById(req.session.shopId);

        if (!currentShop) {
            return renderError(res, 404, "Shop not found");
        }

        return res.render("payments/receive", {
            currentShop
        });
    } catch (error) {
        paymentError(error, "SHOW RECEIVE MONEY ERROR");

        return renderError(res, 500, "Unable to load Receive Money");
    }
};

export const createPaymentRequest = async (req, res) => {
    try {
        const currentShop = await Shop.findById(req.session.shopId);

        if (!currentShop) {
            return renderError(res, 404, "Shop not found");
        }

        if (
            !validWallet(
                normalizeWalletAddress(currentShop.walletAddress)
            )
        ) {
            return renderError(
                res,
                400,
                "Your shop needs a valid Open Payments wallet"
            );
        }

        const { amount } = req.body;
        const reference = String(req.body.reference || "").trim();

        if (!validAmount(amount)) {
            return renderError(
                res,
                400,
                "Enter a valid payment amount"
            );
        }

        if (!reference || reference.length > 120) {
            return renderError(
                res,
                400,
                "Enter a valid payment reference"
            );
        }

        const paymentRequest = await PaymentRequest.create({
            shop: currentShop._id,
            walletAddress: normalizeWalletAddress(
                currentShop.walletAddress
            ),
            amount: Number(amount),
            currency: "ZAR",
            reference,
            expiresAt: new Date(Date.now() + 30 * 60 * 1000)
        });

        return res.redirect(
            `/payments/receive/${paymentRequest._id}`
        );
    } catch (error) {
        paymentError(error, "CREATE PAYMENT REQUEST ERROR");

        return renderError(
            res,
            500,
            "Unable to create payment request"
        );
    }
};

export const showGeneratedPaymentRequest = async (req, res) => {
    try {
        const paymentRequest = await PaymentRequest.findById(
            req.params.paymentRequestId
        ).populate("shop");

        if (!paymentRequest) {
            return renderError(res, 404, "Payment request not found");
        }

        if (
            paymentRequest.shop?._id.toString() !==
            String(req.session.shopId)
        ) {
            return renderError(
                res,
                403,
                "You cannot view this payment request"
            );
        }

        const paymentUrl =
            `${getPublicBaseUrl(req)}` +
            `/pay/${paymentRequest._id}`;

        const qrCode = await QRCode.toDataURL(paymentUrl);

        return res.render("payments/payment-request", {
            paymentRequest,
            paymentUrl,
            qrCode
        });
    } catch (error) {
        paymentError(error, "SHOW PAYMENT REQUEST ERROR");

        return renderError(
            res,
            500,
            "Unable to load payment request"
        );
    }
};

export const showCustomerPayment = async (req, res) => {
    try {
        const paymentRequest = await PaymentRequest.findById(
            req.params.paymentRequestId
        ).populate("shop");

        if (!paymentRequest) {
            return renderError(res, 404, "Payment request not found");
        }

        if (paymentRequest.status !== "pending") {
            return renderError(
                res,
                400,
                "This payment request is no longer active"
            );
        }

        if (
            paymentRequest.expiresAt &&
            new Date() > paymentRequest.expiresAt
        ) {
            paymentRequest.status = "expired";
            await paymentRequest.save();

            return renderError(
                res,
                400,
                "This payment request has expired"
            );
        }

        return res.render("payments/customer-pay", {
            paymentRequest
        });
    } catch (error) {
        paymentError(error, "SHOW CUSTOMER PAYMENT ERROR");

        return renderError(
            res,
            500,
            "Unable to load customer payment"
        );
    }
};

export const startCustomerOpenPayment = async (req, res) => {
    try {
        const paymentRequest = await PaymentRequest.findById(
            req.params.paymentRequestId
        ).populate("shop");

        if (!paymentRequest) {
            return renderError(res, 404, "Payment request not found");
        }

        if (paymentRequest.status !== "pending") {
            return renderError(
                res,
                400,
                "This payment request is no longer active"
            );
        }

        if (
            paymentRequest.expiresAt &&
            new Date() > paymentRequest.expiresAt
        ) {
            paymentRequest.status = "expired";
            await paymentRequest.save();

            return renderError(
                res,
                400,
                "This payment request has expired"
            );
        }

        if (
            req.session.customerOpenPayment?.paymentRequestId ===
            paymentRequest._id.toString()
        ) {
            return renderError(
                res,
                409,
                "This payment already has an authorization attempt in progress"
            );
        }

        const senderWalletAddress = normalizeWalletAddress(
            req.body.payerWalletAddress
        );

        const receiverWalletAddress = normalizeWalletAddress(
            paymentRequest.walletAddress
        );

        if (!validWallet(senderWalletAddress)) {
            return renderError(
                res,
                400,
                "Enter a valid Open Payments wallet address"
            );
        }

        if (!validWallet(receiverWalletAddress)) {
            return renderError(
                res,
                400,
                "The recipient wallet address is invalid"
            );
        }

        if (!validAmount(paymentRequest.amount)) {
            return renderError(
                res,
                400,
                "Invalid payment request amount"
            );
        }

        const finishUri =
            `${getPublicBaseUrl(req)}` +
            `/pay/${paymentRequest._id}/open-payments/callback`;

        const redirectUrl = await startOpenPayment({
            req,
            senderWalletAddress,
            receiverWalletAddress,
            amount: paymentRequest.amount,
            finishUri,
            sessionKey: "customerOpenPayment",
            sessionData: {
                paymentRequestId: paymentRequest._id.toString()
            }
        });

        return res.redirect(redirectUrl);
    } catch (error) {
        paymentError(error, "START CUSTOMER PAYMENT ERROR");

        return renderError(
            res,
            502,
            "Unable to start Open Payments checkout"
        );
    }
};

export const finishCustomerOpenPayment = async (req, res) => {
    try {
        const state = req.session.customerOpenPayment;

        if (!state) {
            return renderError(
                res,
                400,
                "Customer payment session not found"
            );
        }

        if (
            state.paymentRequestId !== req.params.paymentRequestId
        ) {
            return renderError(
                res,
                403,
                "Payment session does not match this request"
            );
        }

        const paymentRequest = await PaymentRequest.findById(
            state.paymentRequestId
        ).populate("shop");

        if (!paymentRequest) {
            return renderError(res, 404, "Payment request not found");
        }

        if (paymentRequest.status === "paid") {
            const existingTransaction = await Transaction.findOne({
                paymentRequest: paymentRequest._id
            });

            await clearPaymentSession(req, "customerOpenPayment");

            return res.render("payments/customer-success", {
                paymentRequest,
                outgoingPayment: existingTransaction
                    ? {
                        id: existingTransaction.providerTransactionId
                    }
                    : null
            });
        }

        if (!req.query.interact_ref) {
            if (state.processing) {
                return renderError(
                    res,
                    409,
                    "This payment requires a status check"
                );
            }

            await clearPaymentSession(req, "customerOpenPayment");

            return res.redirect(
                `/pay/${req.params.paymentRequestId}`
            );
        }

        if (!(await reserveCallback(req, "customerOpenPayment"))) {
            return renderError(
                res,
                409,
                "This payment is already processing or requires verification"
            );
        }

        const outgoingPayment = await executeOpenPayment(
            state,
            req.query.interact_ref
        );

        if (outgoingPayment.failed === true) {
            await clearPaymentSession(req, "customerOpenPayment");

            return renderError(
                res,
                400,
                "The payment provider reported that this transaction failed"
            );
        }

        if (!outgoingPayment.id) {
            return renderError(
                res,
                502,
                "The provider returned an incomplete payment result. Do not retry until the status is checked."
            );
        }

        let transaction = await Transaction.findOne({
            paymentRequest: paymentRequest._id
        });

        if (!transaction) {
            transaction = await Transaction.create({
                paymentRequest: paymentRequest._id,
                toShop: paymentRequest.shop._id,
                amount: paymentRequest.amount,
                currency: paymentRequest.currency,
                type: "customer_payment",
                status: "successful",
                reference: paymentRequest.reference,
                providerTransactionId: outgoingPayment.id
            });
        }

        paymentRequest.status = "paid";
        await paymentRequest.save();

        try {
            await notifyOnce(transaction, {
                user: paymentRequest.shop.owner,
                message: `R${Number(paymentRequest.amount).toFixed(2)} received via Open Payments`,
                relatedShop: paymentRequest.shop._id
            });
        } catch (notificationError) {
            console.error("CUSTOMER PAYMENT NOTIFICATION ERROR:", notificationError);
        }

        await clearPaymentSession(req, "customerOpenPayment");

        return res.render("payments/customer-success", {
            paymentRequest,
            outgoingPayment
        });
    } catch (error) {
        paymentError(error, "FINISH CUSTOMER PAYMENT ERROR");

        return renderError(
            res,
            502,
            "The payment outcome requires verification. Do not attempt another payment until it has been checked."
        );
    }
};

export const getPaymentRequestStatus = async (req, res) => {
    try {
        const paymentRequest = await PaymentRequest.findById(
            req.params.paymentRequestId
        );

        if (!paymentRequest) {
            return res.status(404).json({
                success: false,
                message: "Payment request not found"
            });
        }

        if (
            paymentRequest.shop.toString() !==
            String(req.session.shopId)
        ) {
            return res.status(403).json({
                success: false,
                message: "Not authorized"
            });
        }

        let transactionId = null;

        if (paymentRequest.status === "paid") {
            const transaction = await Transaction.findOne({
                paymentRequest: paymentRequest._id
            });

            transactionId = transaction?._id || null;
        }

        return res.json({
            success: true,
            status: paymentRequest.status,
            amount: paymentRequest.amount,
            currency: paymentRequest.currency,
            transactionId
        });
    } catch (error) {
        console.error("PAYMENT STATUS ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to check payment status"
        });
    }
};
