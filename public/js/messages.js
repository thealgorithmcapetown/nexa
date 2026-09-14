const messageCount =
    document.getElementById(
        "message-count"
    );


const socket = io();


const currentShopId =
    window.dashboardData
        ?.currentShopId;


const loadMessageCount = async () => {

    try {

        const response = await fetch(
            "/api/messages/unread-count"
        );

        const data =
            await response.json();


        if (!messageCount) {
            return;
        }


        if (data.unreadCount > 0) {

            messageCount.textContent =
                data.unreadCount;

            messageCount.style.display =
                "inline";

        } else {

            messageCount.style.display =
                "none";

        }

    } catch (error) {

        console.error(
            "Unable to load unread message count",
            error
        );

    }

};


socket.on(
    "messageUnreadChanged",
    (data) => {

        if (
            data.receiverShopId ===
            currentShopId
        ) {

            loadMessageCount();

        }

    }
);


loadMessageCount();