
document.addEventListener("DOMContentLoaded", () => {

    const currentPath = window.location.pathname;

    const moreTrigger = document.getElementById("nexa-more-trigger");
    const moreMenu = document.getElementById("nexa-more-menu");
    const moreBackdrop = document.getElementById("nexa-more-backdrop");
    const moreClose = document.getElementById("nexa-more-close");

    const matchesPath = (target) => {
        return currentPath === target ||
            currentPath.startsWith(target + "/");
    };


    // ACTIVE BOTTOM NAVIGATION

    document.querySelectorAll(".nexa-mobile-nav [data-nav]").forEach(link => {

        const target = link.dataset.nav;

        // More-specific pages can override their parent section.
        const active = matchesPath(target);

        if (active) {
            link.classList.add("active");
            link.setAttribute("aria-current", "page");
        }

    });


    // ACTIVE MORE MENU LINKS

    let isMoreSection = false;

    document.querySelectorAll("[data-more-nav]").forEach(link => {

        const target = link.dataset.moreNav;

        if (matchesPath(target)) {

            link.classList.add("active");
            link.setAttribute("aria-current", "page");

            isMoreSection = true;

        }

    });


    if (moreTrigger && moreMenu && moreBackdrop && moreClose) {

        if (isMoreSection) {
            moreTrigger.classList.add("active");
        }

        const openMore = () => {

            moreMenu.hidden = false;
            moreBackdrop.hidden = false;

            moreMenu.setAttribute("aria-hidden", "false");
            moreTrigger.setAttribute("aria-expanded", "true");
            moreTrigger.classList.add("active");

            moreClose.focus();

        };

        const closeMore = () => {

            moreMenu.hidden = true;
            moreBackdrop.hidden = true;

            moreMenu.setAttribute("aria-hidden", "true");
            moreTrigger.setAttribute("aria-expanded", "false");

            if (!isMoreSection) {
                moreTrigger.classList.remove("active");
            }

            moreTrigger.focus();

        };

        moreTrigger.addEventListener("click", () => {

            if (moreMenu.hidden) {
                openMore();
            } else {
                closeMore();
            }

        });

        moreClose.addEventListener("click", closeMore);
        moreBackdrop.addEventListener("click", closeMore);

        document.addEventListener("keydown", (event) => {

            if (event.key === "Escape" && !moreMenu.hidden) {
                closeMore();
            }

        });

        window.addEventListener("resize", () => {

            if (window.innerWidth > 768 && !moreMenu.hidden) {
                closeMore();
            }

        });

    }


    // LUCIDE ICONS

    if (window.lucide) {
        window.lucide.createIcons();
    }

});
