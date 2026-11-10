
import {
    isFinalizedGrantWithAccessToken,
    isPendingGrant
} from "@interledger/open-payments";

import {
    createOpenPaymentsClient
} from "../config/openPayments.js";

const validateAmount = (amount) => {
    const value = Number(amount);

    if (
        !Number.isFinite(value) ||
        value <= 0 ||
        Math.abs(Math.round(value * 100) - value * 100) > 0.000001
    ) {
        throw new Error(
            "Enter a valid ZAR amount with at most two decimal places"
        );
    }

    return value;
};

const validateZarWallet = (wallet) => {
    if (
        wallet.assetCode !== "ZAR" ||
        wallet.assetScale !== 2
    ) {
        throw new Error(
            "This payment requires an Open Payments wallet configured for ZAR"
        );
    }
};

const getWallet = async (client, walletAddress, label) => {
    console.log(`${label} WALLET URL:`, walletAddress);

    try {
        const wallet = await client.walletAddress.get({
            url: walletAddress
        });

        console.log(`${label} WALLET FETCH: SUCCESS`);
        console.log(`${label} WALLET ID:`, wallet.id);
        console.log(`${label} ASSET:`, wallet.assetCode);
        console.log(`${label} ASSET SCALE:`, wallet.assetScale);

        return wallet;

    } catch (error) {
        console.error(`${label} WALLET FETCH FAILED`);
        console.error("WALLET URL:", walletAddress);
        console.error("ERROR MESSAGE:", error.message);
        console.error("ERROR DESCRIPTION:", error.description);
        console.error("ERROR CAUSE:", error.cause);

        throw error;
    }
};

export const createIncomingPayment = async ({
    receiverWalletAddress,
    amount
}) => {
    const paymentAmount = validateAmount(amount);

    const client = await createOpenPaymentsClient();

    const receiverWallet = await getWallet(
        client,
        receiverWalletAddress,
        "RECEIVER"
    );

    validateZarWallet(receiverWallet);

    const grant = await client.grant.request(
        {
            url: receiverWallet.authServer
        },
        {
            access_token: {
                access: [
                    {
                        type: "incoming-payment",
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

    if (!isFinalizedGrantWithAccessToken(grant)) {
        throw new Error(
            "Expected finalized incoming-payment grant"
        );
    }

    const amountInMinorUnits = Math.round(
        paymentAmount * 100
    );

    const incomingPayment = await client.incomingPayment.create(
        {
            url: receiverWallet.resourceServer,
            accessToken: grant.access_token.value
        },
        {
            walletAddress: receiverWallet.id,
            incomingAmount: {
                value: amountInMinorUnits.toString(),
                assetCode: receiverWallet.assetCode,
                assetScale: receiverWallet.assetScale
            },
            expiresAt: new Date(
                Date.now() + 10 * 60 * 1000
            ).toISOString()
        }
    );

    console.log("INCOMING PAYMENT CREATED:", incomingPayment.id);

    return {
        incomingPayment,
        receiverWallet
    };
};

export const createQuote = async ({
    senderWalletAddress,
    incomingPaymentUrl
}) => {
    console.log("STARTING QUOTE CREATION");

    const client = await createOpenPaymentsClient();

    const senderWallet = await getWallet(
        client,
        senderWalletAddress,
        "SENDER"
    );

    validateZarWallet(senderWallet);

    const grant = await client.grant.request(
        {
            url: senderWallet.authServer
        },
        {
            access_token: {
                access: [
                    {
                        type: "quote",
                        actions: [
                            "create",
                            "read"
                        ]
                    }
                ]
            }
        }
    );

    if (!isFinalizedGrantWithAccessToken(grant)) {
        throw new Error(
            "Expected finalized quote grant"
        );
    }

    const quote = await client.quote.create(
        {
            url: senderWallet.resourceServer,
            accessToken: grant.access_token.value
        },
        {
            walletAddress: senderWallet.id,
            receiver: incomingPaymentUrl,
            method: "ilp"
        }
    );

    console.log("QUOTE CREATED:", quote.id);

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
    const client = await createOpenPaymentsClient();

    const senderWallet = await getWallet(
        client,
        senderWalletAddress,
        "OUTGOING SENDER"
    );

    validateZarWallet(senderWallet);

    const grant = await client.grant.request(
        {
            url: senderWallet.authServer
        },
        {
            access_token: {
                access: [
                    {
                        identifier: senderWallet.id,
                        type: "outgoing-payment",
                        actions: [
                            "list",
                            "list-all",
                            "read",
                            "read-all",
                            "create"
                        ],
                        limits: {
                            debitAmount: {
                                assetCode: quote.debitAmount.assetCode,
                                assetScale: quote.debitAmount.assetScale,
                                value: quote.debitAmount.value
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
                    method: "redirect",
                    uri: finishUri,
                    nonce
                }
            }
        }
    );

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
    const client = await createOpenPaymentsClient();

    const grant = await client.grant.continue(
        {
            url: continueUri,
            accessToken: continueAccessToken
        },
        {
            interact_ref: interactRef
        }
    );

    if (!isFinalizedGrantWithAccessToken(grant)) {
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
    const client = await createOpenPaymentsClient();

    const senderWallet = await getWallet(
        client,
        senderWalletAddress,
        "FINAL SENDER"
    );

    validateZarWallet(senderWallet);

    const outgoingPayment = await client.outgoingPayment.create(
        {
            url: senderWallet.resourceServer,
            accessToken: outgoingAccessToken
        },
        {
            walletAddress: senderWallet.id,
            quoteId: quoteUrl
        }
    );

    console.log("OUTGOING PAYMENT CREATED:", outgoingPayment.id);

    return outgoingPayment;
};
