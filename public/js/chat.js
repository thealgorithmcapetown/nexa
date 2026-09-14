const socket = io();

const chatForm =
    document.getElementById("chat-form");

const messageInput =
    document.getElementById("message-input");

const messagesContainer =
    document.getElementById(
        "messages-container"
    );


const {
    currentShopId,
    otherShopId,
    otherShopName,
    tradeId
} = window.chatData;


socket.emit("joinChat", {

    shopA: currentShopId,

    shopB: otherShopId,

    tradeId

});


chatForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();


        const content =
            messageInput.value.trim();


        if (!content) {
            return;
        }


        const url = tradeId
            ? `/messages/${otherShopId}?trade=${tradeId}`
            : `/messages/${otherShopId}`;


        try {

            const response = await fetch(
                url,
                {
                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/x-www-form-urlencoded",

                        "Accept":
                            "application/json"

                    },

                    body:
                        new URLSearchParams({
                            content
                        })
                }
            );


            if (!response.ok) {

                console.error(
                    "Unable to save message"
                );

                return;

            }


            socket.emit(
                "sendMessage",
                {
                    senderShopId:
                        currentShopId,

                    receiverShopId:
                        otherShopId,

                    tradeId,

                    content,

                    createdAt:
                        new Date().toISOString()
                }
            );


            messageInput.value = "";


        } catch (error) {

            console.error(
                "MESSAGE SEND ERROR:",
                error
            );

        }

    }
);


socket.on(
    "receiveMessage",
    (message) => {

        const messageRow =
            document.createElement("div");

        messageRow.classList.add(
            "message-row"
        );


        const isMine =
            message.senderShopId ===
            currentShopId;
            if (!isMine) {

    fetch(
        `/api/messages/${otherShopId}/read`,
        {
            method: "PATCH"
        }
    )
        .then(() => {

            socket.emit(
                "messageRead",
                {
                    shopId: currentShopId
                }
            );

        })
        .catch(error => {

            console.error(
                "Unable to mark message as read:",
                error
            );

        });

}


        messageRow.classList.add(
            isMine ? "mine" : "theirs"
        );


        const messageBubble =
            document.createElement("div");

        messageBubble.classList.add(
            "message-bubble"
        );


        const sender =
            document.createElement("strong");

        sender.textContent =
            isMine
                ? "You"
                : otherShopName;


        const content =
            document.createElement("p");

        content.textContent =
            message.content;


        const time =
            document.createElement("small");

        time.textContent =
            new Date(
                message.createdAt
            ).toLocaleTimeString(
                [],
                {
                    hour: "2-digit",
                    minute: "2-digit"
                }
            );


        messageBubble.appendChild(
            sender
        );

        messageBubble.appendChild(
            content
        );

        messageBubble.appendChild(
            time
        );


        messageRow.appendChild(
            messageBubble
        );


        messagesContainer.appendChild(
            messageRow
        );


        const noMessages =
            document.getElementById(
                "no-messages"
            );

        if (noMessages) {
            noMessages.remove();
        }


        scrollToBottom();

    }
);
const scrollToBottom = () => {

    messagesContainer.scrollTop =
        messagesContainer.scrollHeight;

};

scrollToBottom();