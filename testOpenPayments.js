import dotenv from "dotenv";

import {
    createOpenPaymentsClient
} from "./config/openPayments.js";


dotenv.config();


try {

    console.log(
        "Connecting to Open Payments..."
    );


    const client =
        await createOpenPaymentsClient();

    console.log(
    "Wallet URL being tested:",
    JSON.stringify(
        process.env.OPEN_PAYMENTS_WALLET_ADDRESS
    )
);
    const wallet =
        await client.walletAddress.get({

            url:
                process.env
                    .OPEN_PAYMENTS_WALLET_ADDRESS

        });

        
    console.log(
        "OPEN PAYMENTS CONNECTED"
    );


    console.log(
        "Wallet ID:",
        wallet.id
    );


    console.log(
        "Asset:",
        wallet.assetCode
    );


    console.log(
        "Asset Scale:",
        wallet.assetScale
    );


    console.log(
        "Resource Server:",
        wallet.resourceServer
    );


    console.log(
        "Authorization Server:",
        wallet.authServer
    );


}  catch (error) {

    console.error(
        "OPEN PAYMENTS CONNECTION FAILED"
    );

    console.error("ERROR:");
    console.error(error);

    console.error("\nCAUSE:");
    console.error(error.cause);

    console.error("\nDETAILS:");
    console.dir(error, {
        depth: null
    });


}