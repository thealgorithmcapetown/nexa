
document.addEventListener("DOMContentLoaded", () => {
    const currentPath = window.location.pathname;

    document.querySelectorAll("[data-nav]").forEach(link => {
        const target = link.dataset.nav;

        const active =
            currentPath === target ||
            (target !== "/dashboard" &&
             currentPath.startsWith(target + "/"));

        if (active) {
            link.classList.add("active");
            link.setAttribute("aria-current", "page");
        }
    });

    if (window.lucide) {
        window.lucide.createIcons();
    }
});
