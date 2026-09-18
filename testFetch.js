try {

    const response = await fetch(
        "https://ilp.interledger-test.dev/bruno-elias-zar",
        {
            headers: {
                Accept: "application/json"
            }
        }
    );

    console.log("STATUS:", response.status);

    const data = await response.json();

    console.log(data);

} catch (error) {

    console.error("NODE FETCH FAILED");

    console.error(error);

    console.error("CAUSE:", error.cause);

}