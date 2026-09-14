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
                .populate("offer");


        if (!transaction) {

            return res.status(404).send(
                "Transaction not found"
            );

        }


        const currentShopId =
            req.session.shopId.toString();


        const isSender =
            transaction.fromShop._id
                .toString() ===
            currentShopId;


        const isReceiver =
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
                currentShopId
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