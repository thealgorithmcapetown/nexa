export const requireAuth = (req, res, next) => {

   
    if (!req.session.userId) {

        return res.redirect("/login");

    }


    
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