const express = require("express");

const {
    register,
    login,
    getProfile,
    updateProfile,
    logout,
} = require("../controllers/authController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

//public routes
router.post("/register", register);

router.post("/login", login);

//protected routes
router.get(
    "/profile",
    authMiddleware,
    getProfile
);

router.put(
    "/profile",
    authMiddleware,
    updateProfile
);

router.post(
    "/logout",
    authMiddleware,
    logout
);

module.exports = router;