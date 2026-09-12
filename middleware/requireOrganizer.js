// Runs after authMiddleware (which already verified the JWT and set
// req.user). Restricts a route to organizer accounts only — used for
// event/offer cover image uploads, which only organizers should be
// able to do.
const requireOrganizer = (req, res, next) => {
    if (!req.user || req.user.role !== "organizer") {
        return res.status(403).json({
            message: "Organizer access required.",
        });
    }

    next();
};

module.exports = requireOrganizer;
