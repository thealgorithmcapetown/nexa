import dotenv from "dotenv";

import {
    createIncomingPayment,
    createQuote
} from "./services/openPaymentsService.js";


dotenv.config();


try {

    console.log(
        "Creating Bruno incoming payment..."
    );


    // -------------------------------
    // BRUNO RECEIVES R10
    // -------------------------------

    const incomingResult =
        await createIncomingPayment({

            receiverWalletAddress:
                "https://ilp.interledger-test.dev/bruno-elias-zar",

            amount:
                10

        });


    console.log(
        "\nINCOMING PAYMENT CREATED"
    );

    console.log(
        "Incoming Payment:",
        incomingResult.incomingPayment.id
    );


    console.log(
        "\nCreating quote for Devante..."
    );


    // -------------------------------
    // DEVANTE PAYS
    // -------------------------------

    const quoteResult =
        await createQuote({

            senderWalletAddress:
                "https://ilp.interledger-test.dev/devante-zar",

            incomingPaymentUrl:
                incomingResult.incomingPayment.id

        });


    console.log(
        "\nQUOTE CREATED"
    );


    console.log(
        "Quote ID:",
        quoteResult.quote.id
    );


    console.log(
        "Debit Amount:",
        quoteResult.quote.debitAmount
    );


    console.log(
        "Receive Amount:",
        quoteResult.quote.receiveAmount
    );


    console.log(
        "Expires At:",
        quoteResult.quote.expiresAt
    );


} catch (error) {

    console.error(
        "\nQUOTE TEST FAILED"
    );

    console.error(error);

}