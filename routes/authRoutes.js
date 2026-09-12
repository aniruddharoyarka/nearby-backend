const express = require("express");

const {
    register,
    login,
    getProfile,
    uploadProfilePicture,
    deleteProfilePicture,
} = require("../controllers/authController");

const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../middleware/multer.middleware");
const multerErrorHandling = require("../middleware/multerError.middleware");

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

router.post(
    "/profile-picture",
    authMiddleware,
    upload.single("profilePicture"),
    multerErrorHandling,
    uploadProfilePicture
);

router.delete(
    "/profile-picture",
    authMiddleware,
    deleteProfilePicture
);

module.exports = router;
