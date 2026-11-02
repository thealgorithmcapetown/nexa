
/* ========================================
   NEXA — GLOBAL LOADER
======================================== */

document.addEventListener("DOMContentLoaded", () => {

    const loader = document.getElementById("nexaLoader");
    const message = document.getElementById("nexaLoaderMessage");

    if (!loader || !message) return;

    const minimumDuration = 800;

    const messages = [
        "Bettering your experience...",
        "Connecting your marketplace...",
        "Making trading easier...",
        "Finding your next opportunity...",
        "Bringing vendors together...",
        "Getting things ready...",
        "Powering your next trade...",
        "Your marketplace is loading...",
        "Making business simpler...",
        "Connecting local businesses...",
        "Preparing your workspace...",
        "Building stronger connections...",
        "Keeping your business moving...",
        "Good things are loading...",
        "Almost there..."
    ];

    let messageIndex = -1;
    let messageInterval;
    let hideTimeout;
    let navigationPending = false;

    // Check whether the user is on mobile
    function isMobile() {
        return window.matchMedia("(max-width: 768px)").matches;
    }

    // Select a random message without repeating the previous one
    function randomizeMessage() {

        let nextIndex;

        do {
            nextIndex = Math.floor(Math.random() * messages.length);
        } while (nextIndex === messageIndex);

        messageIndex = nextIndex;
        message.textContent = messages[messageIndex];
    }

    function showLoader() {

        if (!isMobile()) return;

        clearTimeout(hideTimeout);
        clearInterval(messageInterval);

        loader.hidden = false;
        loader.classList.remove("is-hiding");

        // Start with a random message
        randomizeMessage();

        // Randomize again if loading takes longer
        messageInterval = setInterval(() => {

            randomizeMessage();

        }, 1800);
    }

    function hideLoader() {

        clearInterval(messageInterval);
        clearTimeout(hideTimeout);

        loader.classList.add("is-hiding");

        hideTimeout = setTimeout(() => {
            loader.hidden = true;
            loader.classList.remove("is-hiding");
        }, 250);

        navigationPending = false;
    }

    // Show loader when navigating to another internal page
    document.addEventListener("click", (event) => {

        if (!isMobile()) return;

        const link = event.target.closest("a[href]");

        if (!link ||
            event.defaultPrevented ||
            event.button !== 0 ||
            event.ctrlKey ||
            event.metaKey ||
            event.shiftKey ||
            event.altKey ||
            link.hasAttribute("download") ||
            (link.target && link.target !== "_self")) {
            return;
        }

        const url = new URL(link.href, window.location.href);

        if (!["http:", "https:"].includes(url.protocol)) return;
        if (url.origin !== window.location.origin) return;

        // Ignore links to the current page or its anchors
        if (url.pathname === window.location.pathname &&
            url.search === window.location.search) {
            return;
        }

        if (navigationPending) {
            event.preventDefault();
            return;
        }

        event.preventDefault();

        navigationPending = true;
        showLoader();

        setTimeout(() => {
            window.location.assign(url.href);
        }, minimumDuration);

    });

    // Show loader for normal form submissions
    document.addEventListener("submit", (event) => {

        if (!isMobile() || event.defaultPrevented) return;

        const form = event.target;

        if ((form.target && form.target !== "_self") ||
            !form.checkValidity()) {
            return;
        }

        // Don't delay forms or change how they submit
        showLoader();

    });

    // Reset when returning via browser history
    window.addEventListener("pageshow", () => {
        hideLoader();
    });

    window.NexaLoader = {
        show: showLoader,
        hide: hideLoader
    };

});
