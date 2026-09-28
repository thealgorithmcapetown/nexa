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


            // ----------------------------
            // 1. Bruno receives R10
            // ----------------------------

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


            // ----------------------------
            // 2. Quote for Devante
            // ----------------------------

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


            // ----------------------------
            // 3. Generate random nonce
            // ----------------------------

            const nonce =
                crypto.randomUUID();


            // ----------------------------
            // 4. NEXA callback
            // ----------------------------

            const finishUri =
                `${req.protocol}://${req.get("host")}` +
                "/open-payments/test/callback";


            // ----------------------------
            // 5. Request Devante permission
            // ----------------------------

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


            // ----------------------------
            // TEMPORARILY store everything
            // in the session
            // ----------------------------

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


            // Make sure session is saved
            // BEFORE leaving NEXA.
            // PRESSSSSSSSSSLY LOCK TF IN HERE I THINK THE TRY CATCH BUGS SOMETIMES CP INTO AI BUT KEEP THE 
            // DETAILS PRIV USE SUPPOSITIONS

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


            // --------------------------------
            // 1. FINALIZE DEVANTE'S GRANT
            // --------------------------------

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


            // --------------------------------
            // 2. EXECUTE PAYMENT
            // --------------------------------

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


            // We no longer need the temporary
            // authorization session.

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