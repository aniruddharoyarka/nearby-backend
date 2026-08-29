const express = require("express");

const {
    register,
    login,
    getProfile,
} = require("../controllers/authController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// ==========================================
// Public authentication routes
// ==========================================

router.post("/register", register);

router.post("/login", login);

// ==========================================
// Protected authentication routes
// ==========================================

router.get(
    "/profile",
    authMiddleware,
    getProfile
);

module.exports = router;