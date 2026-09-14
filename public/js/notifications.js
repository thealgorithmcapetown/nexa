const notificationCount = document.getElementById(
    "notification-count"
);

const loadNotificationCount = async () => {

    try {

        const response = await fetch(
            "/api/notifications/unread-count"
        );

        const data = await response.json();

        if (!notificationCount) {
            return;
        }

        if (data.unreadCount > 0) {

            notificationCount.textContent =
                data.unreadCount;

            notificationCount.style.display =
                "inline";

        } else {

            notificationCount.style.display =
                "none";

        }

    } catch (error) {

        console.error(
            "Unable to load notifications",
            error
        );

    }

};


loadNotificationCount();