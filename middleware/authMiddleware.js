const jwt = require("jsonwebtoken");
const User = require("../models/User");

const clearAuthCookie = (res) => {
    res.clearCookie("token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        path: "/",
    });
};

const authMiddleware = async (req, res, next) => {
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

        const user = await User.findById(decoded.userId).select("status");

        if (!user || user.status === "Suspended") {
            clearAuthCookie(res);

            return res.status(403).json({
                message: "This account has been suspended.",
            });
        }

        req.user = decoded;

        next();

    } catch (error) {
        console.error("Authentication error:", error);

        clearAuthCookie(res);

        return res.status(401).json({
            message: "Invalid or expired token.",
        });
    }
};

module.exports = authMiddleware;
