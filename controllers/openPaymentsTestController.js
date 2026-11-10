import crypto from "crypto";

import {
    createIncomingPayment,
    createQuote,
    requestOutgoingPaymentGrant,
    continueOutgoingPaymentGrant,
    createOutgoingPayment
} from "../services/openPaymentsService.js";


export const startRealPaymentTest =
    async (req, res) => {

        try {

            console.log(
                "\nSTARTING REAL PAYMENT TEST"
            );


            const incomingResult =
                await createIncomingPayment({

                    receiverWalletAddress:
                        "https://ilp.interledger-test.dev/bruno-elias-zar",

                    amount:
                        10

                });


            console.log(
                "Incoming payment created:",
                incomingResult.incomingPayment.id
            );


            const quoteResult =
                await createQuote({

                    senderWalletAddress:
                        "https://ilp.interledger-test.dev/devante-zar",

                    incomingPaymentUrl:
                        incomingResult.incomingPayment.id

                });


            console.log(
                "Quote created:",
                quoteResult.quote.id
            );


            const nonce =
                crypto.randomUUID();


            const finishUri =
                `${req.protocol}://${req.get("host")}` +
                "/open-payments/test/callback";


            const outgoingGrantResult =
                await requestOutgoingPaymentGrant({

                    senderWalletAddress:
                        "https://ilp.interledger-test.dev/devante-zar",

                    quote:
                        quoteResult.quote,

                    finishUri,

                    nonce

                });


            const grant =
                outgoingGrantResult.grant;


            req.session.openPaymentsTest = {

                incomingPaymentUrl:
                    incomingResult.incomingPayment.id,

                quoteUrl:
                    quoteResult.quote.id,

                senderWalletAddress:
                    "https://ilp.interledger-test.dev/devante-zar",

                continueUri:
                    grant.continue.uri,

                continueAccessToken:
                    grant.continue.access_token.value,

                nonce

            };


            req.session.save(
                (error) => {

                    if (error) {

                        console.error(
                            "SESSION SAVE ERROR:",
                            error
                        );

                        return res.status(500).send(
                            "Unable to save payment session"
                        );

                    }


                    console.log(
                        "Redirecting Devante to authorization..."
                    );


                    return res.redirect(
                        grant.interact.redirect
                    );

                }
            );


        } catch (error) {

            console.error(
                "REAL PAYMENT TEST ERROR:"
            );

            console.error(error);


            return res.status(500).send(
                "Unable to start Open Payments authorization"
            );

        }

    };


export const finishRealPaymentTest =
    async (req, res) => {

        try {

            console.log(
                "\nDEVANTE RETURNED TO NEXA"
            );


            const paymentSession =
                req.session.openPaymentsTest;


            if (!paymentSession) {

                return res.status(400).send(
                    "Open Payments session not found"
                );

            }


            const interactRef =
                req.query.interact_ref;


            if (!interactRef) {

                return res.status(400).send(
                    "Missing interact_ref"
                );

            }


            console.log(
                "Continuing outgoing payment grant..."
            );


            const finalizedGrant =
                await continueOutgoingPaymentGrant({

                    continueUri:
                        paymentSession.continueUri,

                    continueAccessToken:
                        paymentSession.continueAccessToken,

                    interactRef

                });


            console.log(
                "OUTGOING GRANT FINALIZED"
            );


            console.log(
                "Creating outgoing payment..."
            );


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
                "\nOUTGOING PAYMENT CREATED"
            );


            console.log(
                "ID:",
                outgoingPayment.id
            );


            console.log(
                "Debit Amount:",
                outgoingPayment.debitAmount
            );


            console.log(
                "Sent Amount:",
                outgoingPayment.sentAmount
            );


            console.log(
                "Receive Amount:",
                outgoingPayment.receiveAmount
            );


            console.log(
                "Failed:",
                outgoingPayment.failed
            );


            delete req.session.openPaymentsTest;


            return res.send(`

                <h1>Open Payments Test Complete</h1>

                <h2>Payment executed 🎉</h2>

                <p>
                    Devante authorized the payment.
                </p>

                <p>
                    NEXA created the outgoing payment.
                </p>

                <p>
                    Check the Test Wallet balances.
                </p>

            `);


        } catch (error) {

            console.error(
                "\nREAL PAYMENT COMPLETION ERROR:"
            );

            console.error(error);


            return res.status(500).send(
                "Unable to complete Open Payments transaction"
            );

        }

    };