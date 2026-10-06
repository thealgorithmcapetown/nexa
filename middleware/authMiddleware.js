export const requireAuth = (req, res, next) => {

    // User must have a valid login session
    if (!req.session.userId) {

        return res.redirect("/login");

    }


    // Vendor routes also require a shop session
    if (!req.session.shopId) {

        console.error(
            "AUTH ERROR: User session exists without shop session"
        );

        req.session.destroy(() => {

            return res.redirect("/login");

        });

        return;

    }


    next();

};