import dotenv from "dotenv";

import {
    createIncomingPayment
} from "./services/openPaymentsService.js";


dotenv.config();


try {

    console.log(
        "Creating real incoming payment..."
    );


    const result =
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
        "ID:",
        result.incomingPayment.id
    );


    console.log(
        "Wallet:",
        result.incomingPayment.walletAddress
    );


    console.log(
        "Incoming Amount:",
        result.incomingPayment
            .incomingAmount
    );


    console.log(
        "Received Amount:",
        result.incomingPayment
            .receivedAmount
    );


    console.log(
        "Completed:",
        result.incomingPayment.completed
    );


} catch (error) {

    console.error(
        "\nINCOMING PAYMENT FAILED"
    );

    console.error(error);

}