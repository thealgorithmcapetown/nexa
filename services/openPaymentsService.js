import {
    isFinalizedGrantWithAccessToken,
    isPendingGrant
} from "@interledger/open-payments";

import {
    createOpenPaymentsClient
} from "../config/openPayments.js";


export const createIncomingPayment = async ({
    receiverWalletAddress,
    amount
}) => {

    // --------------------------------
    // 1. Create authenticated client
    // --------------------------------

    const client =
        await createOpenPaymentsClient();


    // --------------------------------
    // 2. Discover receiver wallet
    // --------------------------------

    const receiverWallet =
        await client.walletAddress.get({
            url: receiverWalletAddress
        });


    console.log(
        "Receiver:",
        receiverWallet.id
    );

    console.log(
        "Asset:",
        receiverWallet.assetCode
    );


    // --------------------------------
    // 3. Request incoming-payment grant
    // --------------------------------

    const grant =
        await client.grant.request(
            {
                url:
                    receiverWallet.authServer
            },
            {
                access_token: {
                    access: [
                        {
                            type:
                                "incoming-payment",

                            actions: [
                                "list",
                                "read",
                                "read-all",
                                "complete",
                                "create"
                            ]
                        }
                    ]
                }
            }
        );


    if (
        !isFinalizedGrantWithAccessToken(
            grant
        )
    ) {

        throw new Error(
            "Expected finalized incoming-payment grant"
        );

    }


    // --------------------------------
    // 4. Convert Rands → cents
    // --------------------------------

    const amountInMinorUnits =
        Math.round(
            Number(amount) * 100
        );


    // R10.00 becomes:
    //
    // 1000
    //
    // because ZAR has assetScale 2.


    // --------------------------------
    // 5. Create incoming payment
    // --------------------------------

    const incomingPayment =
        await client.incomingPayment.create(
            {
                url:
                    receiverWallet.resourceServer,

                accessToken:
                    grant.access_token.value
            },
            {
                walletAddress:
                    receiverWallet.id,

                incomingAmount: {
                    value:
                        amountInMinorUnits
                            .toString(),

                    assetCode:
                        receiverWallet.assetCode,

                    assetScale:
                        receiverWallet.assetScale
                },

                expiresAt:
                    new Date(
                        Date.now() +
                        10 * 60 * 1000
                    ).toISOString()
            }
        );


    return {
        incomingPayment,
        receiverWallet
    };

};
export const createQuote = async ({
    senderWalletAddress,
    incomingPaymentUrl
}) => {

    const client =
        await createOpenPaymentsClient();


    // 1. Discover Devante's wallet

    const senderWallet =
        await client.walletAddress.get({
            url: senderWalletAddress
        });


    console.log(
        "Sender:",
        senderWallet.id
    );

    console.log(
        "Sender Asset:",
        senderWallet.assetCode
    );


    // 2. Request permission to create a quote

    const grant =
        await client.grant.request(
            {
                url:
                    senderWallet.authServer
            },
            {
                access_token: {
                    access: [
                        {
                            type:
                                "quote",

                            actions: [
                                "create",
                                "read"
                            ]
                        }
                    ]
                }
            }
        );


    if (
        !isFinalizedGrantWithAccessToken(
            grant
        )
    ) {

        throw new Error(
            "Expected finalized quote grant"
        );

    }


    // 3. Create quote

    const quote =
        await client.quote.create(
            {
                url:
                    senderWallet.resourceServer,

                accessToken:
                    grant.access_token.value
            },
            {
                walletAddress:
                    senderWallet.id,

                receiver:
                    incomingPaymentUrl,

                method:
                    "ilp"
            }
        );


    return {
        quote,
        senderWallet
    };

};
export const requestOutgoingPaymentGrant = async ({
    senderWalletAddress,
    quote,
    finishUri,
    nonce
}) => {

    const client =
        await createOpenPaymentsClient();


    // 1. Discover Devante's wallet

    const senderWallet =
        await client.walletAddress.get({
            url: senderWalletAddress
        });


    console.log(
        "Requesting outgoing payment permission from:",
        senderWallet.id
    );


    // 2. Request INTERACTIVE permission
    // to debit Devante's wallet

    const grant =
        await client.grant.request(
            {
                url:
                    senderWallet.authServer
            },
            {
                access_token: {
                    access: [
                        {
                            identifier:
                                senderWallet.id,

                            type:
                                "outgoing-payment",

                            actions: [
                                "list",
                                "list-all",
                                "read",
                                "read-all",
                                "create"
                            ],

                            limits: {

                                debitAmount: {
                                    assetCode:
                                        quote.debitAmount.assetCode,

                                    assetScale:
                                        quote.debitAmount.assetScale,

                                    value:
                                        quote.debitAmount.value
                                }

                            }
                        }
                    ]
                },

                interact: {

                    start: [
                        "redirect"
                    ],

                    finish: {
                        method:
                            "redirect",

                        uri:
                            finishUri,

                        nonce:
                            nonce
                    }

                }
            }
        );


    // We WANT a pending grant here.
    //
    // It means:
    // "Devante needs to approve this."

    if (!isPendingGrant(grant)) {

        throw new Error(
            "Expected interactive outgoing payment grant"
        );

    }


    return {
        grant,
        senderWallet
    };

};
export const continueOutgoingPaymentGrant = async ({
    continueUri,
    continueAccessToken,
    interactRef
}) => {

    const client =
        await createOpenPaymentsClient();


    const grant =
        await client.grant.continue(
            {
                url:
                    continueUri,

                accessToken:
                    continueAccessToken
            },
            {
                interact_ref:
                    interactRef
            }
        );


    if (
        !isFinalizedGrantWithAccessToken(
            grant
        )
    ) {

        throw new Error(
            "Expected finalized outgoing payment grant"
        );

    }


    return grant;

};
export const createOutgoingPayment = async ({
    senderWalletAddress,
    quoteUrl,
    outgoingAccessToken
}) => {

    const client =
        await createOpenPaymentsClient();


    // Discover Devante's wallet

    const senderWallet =
        await client.walletAddress.get({
            url:
                senderWalletAddress
        });


    // Create the actual outgoing payment

    const outgoingPayment =
        await client.outgoingPayment.create(
            {
                url:
                    senderWallet.resourceServer,

                accessToken:
                    outgoingAccessToken
            },
            {
                walletAddress:
                    senderWallet.id,

                quoteId:
                    quoteUrl
            }
        );


    return outgoingPayment;

};