import Transaction from "../models/Transaction.js";


export const showTransactions = async (req, res) => {

    try {

        const currentShopId =
            req.session.shopId;


        const transactions =
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
                });


        return res.render(
            "transactions/index",
            {
                transactions,
                currentShopId
            }
        );


    } catch (error) {

        console.error(
            "SHOW TRANSACTIONS ERROR:",
            error
        );

        return res.status(500).send(
            "Unable to load transactions"
        );

    }

};



export const showTransactionDetails = async (
    req,
    res
) => {

    try {

        const transaction =
            await Transaction.findById(
                req.params.id
            )
                .populate("fromShop")
                .populate("toShop")
                .populate("tradeRequest")
                .populate("payment")
                .populate("offer")
                .populate("paymentRequest");


        if (!transaction) {

            return res.status(404).send(
                "Transaction not found"
            );

        }


        if (!req.session.shopId) {

            return res.status(401).send(
                "Shop session not found"
            );

        }


        const currentShopId =
            req.session.shopId.toString();


        // --------------------------------
        // CUSTOMER QR PAYMENT
        // --------------------------------

        const isCustomerPayment =
            transaction.type ===
            "customer_payment";


        // Customer payments have no
        // fromShop because the customer
        // does not need a NEXA account.

        const isSender =
            !isCustomerPayment &&
            transaction.fromShop &&
            transaction.fromShop._id
                .toString() ===
            currentShopId;


        // Both trade payments and customer
        // payments have a receiving shop.

        const isReceiver =
            transaction.toShop &&
            transaction.toShop._id
                .toString() ===
            currentShopId;


        if (
            !isSender &&
            !isReceiver
        ) {

            return res.status(403).send(
                "You cannot view this transaction"
            );

        }


        return res.render(
            "transactions/details",
            {
                transaction,
                currentShopId,
                isCustomerPayment,
                isSender,
                isReceiver
            }
        );


    } catch (error) {

        console.error(
            "TRANSACTION DETAILS ERROR:",
            error
        );

        return res.status(500).send(
            "Unable to load transaction"
        );

    }

};