
import Transaction from "../models/Transaction.js";

const renderError = (res, statusCode, message) => {
    return res.status(statusCode).render("public/error", {
        statusCode,
        message
    });
};

export const showTransactions = async (req, res) => {
    try {
        if (!req.session.shopId) {
            return renderError(
                res,
                401,
                "Your session has expired. Please log in again."
            );
        }

        const currentShopId = req.session.shopId;

        const transactions = await Transaction.find({
            $or: [
                {
                    fromShop: currentShopId
                },
                {
                    toShop: currentShopId
                }
            ]
        })
            .populate("fromShop")
            .populate("toShop")
            .populate("tradeRequest")
            .sort({
                createdAt: -1
            });

        return res.render("transactions/index", {
            transactions,
            currentShopId
        });
    } catch (error) {
        console.error("SHOW TRANSACTIONS ERROR:", error);

        return renderError(
            res,
            500,
            "Unable to load transactions"
        );
    }
};

export const showTransactionDetails = async (req, res) => {
    try {
        if (!req.session.shopId) {
            return renderError(
                res,
                401,
                "Your session has expired. Please log in again."
            );
        }

        const transaction = await Transaction.findById(req.params.id)
            .populate("fromShop")
            .populate("toShop")
            .populate("tradeRequest")
            .populate("payment")
            .populate("offer")
            .populate("paymentRequest");

        if (!transaction) {
            return renderError(
                res,
                404,
                "Transaction not found"
            );
        }

        const currentShopId = req.session.shopId.toString();

        const isCustomerPayment =
            transaction.type === "customer_payment";

        const isSender =
            !isCustomerPayment &&
            Boolean(transaction.fromShop) &&
            transaction.fromShop._id.toString() === currentShopId;

        const isReceiver =
            Boolean(transaction.toShop) &&
            transaction.toShop._id.toString() === currentShopId;

        if (!isSender && !isReceiver) {
            return renderError(
                res,
                403,
                "You cannot view this transaction"
            );
        }

        return res.render("transactions/details", {
            transaction,
            currentShopId,
            isCustomerPayment,
            isSender,
            isReceiver
        });
    } catch (error) {
        console.error("TRANSACTION DETAILS ERROR:", error);

        return renderError(
            res,
            500,
            "Unable to load transaction"
        );
    }
};
