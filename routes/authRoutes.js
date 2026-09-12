const express = require("express");

const {
    register,
    login,
    getProfile,
<<<<<<< HEAD
    uploadProfilePicture,
    deleteProfilePicture,
=======
    updateProfile,
    changePassword,
    logout,
>>>>>>> 35b139298b5011ad9d9100f4aeaa4caa027d4d5e
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

<<<<<<< HEAD
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
=======
router.put(
    "/profile",
    authMiddleware,
    updateProfile
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
>>>>>>> 35b139298b5011ad9d9100f4aeaa4caa027d4d5e
