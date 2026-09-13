const requireOrganizer = (req, res, next) => {
    if (!req.user || req.user.role !== "organizer") {
        return res.status(403).json({
            message: "Organizer access required.",
        });
    }

    next();
};

module.exports = requireOrganizer;
