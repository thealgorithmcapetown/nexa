import {
    createAuthenticatedClient
} from "@interledger/open-payments";

import path from "path";
import { fileURLToPath } from "url";


const __filename =
    fileURLToPath(import.meta.url);

const __dirname =
    path.dirname(__filename);


export const createOpenPaymentsClient =
    async () => {

        const privateKeyPath =
            path.resolve(
                __dirname,
                "..",
                process.env.OPEN_PAYMENTS_PRIVATE_KEY_PATH
                    || "./keys/private.key"
            );


        const client =
            await createAuthenticatedClient({

                walletAddressUrl:
                    process.env.OPEN_PAYMENTS_WALLET_ADDRESS,

                privateKey:
                    privateKeyPath,

                keyId:
                    process.env.OPEN_PAYMENTS_KEY_ID

            });


        return client;

    };