const express = require("express");

const {
    register,
    login,
    getProfile,
    updateProfile,
    uploadProfilePicture,
    deleteProfilePicture,
    changePassword,
    logout,
} = require("../controllers/authController");

const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../middleware/multer.middleware");
const multerErrorHandling = require("../middleware/multerError.middleware");

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

router.put(
    "/password",
    authMiddleware,
    changePassword
);

router.post(
    "/logout",
    authMiddleware,
    logout
);

module.exports = router;
