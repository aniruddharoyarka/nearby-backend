const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
    try {
        //read jwt from httpOnly cookie
        const token = req.cookies?.token;

        if (!token) {
            return res.status(401).json({
                message: "Authentication required.",
            });
        }

        //verify jwt
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        req.user = decoded;

        next();

    } catch (error) {
        console.error("Authentication error:", error);

        res.clearCookie("token", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            path: "/",
        });

        return res.status(401).json({
            message: "Invalid or expired token.",
        });
    }
};

module.exports = authMiddleware;