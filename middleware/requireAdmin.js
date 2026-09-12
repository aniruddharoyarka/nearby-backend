// Runs after authMiddleware (which already verified the JWT and set
// req.user). This just checks that the authenticated account is an
// admin — used to lock down the admin-only data routes so a regular
// user or organizer can't call them just because they're logged in.
const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== "admin") {
        return res.status(403).json({
            message: "Admin access required.",
        });
    }

    next();
};

module.exports = requireAdmin;
