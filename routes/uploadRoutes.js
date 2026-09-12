const express = require("express");

const {
    uploadEventImage,
    uploadOfferImage,
    deleteCoverImage,
} = require("../controllers/uploadController");

const authMiddleware = require("../middleware/authMiddleware");
const coverImageUpload = require("../middleware/coverImageUpload.middleware");
const multerErrorHandling = require("../middleware/multerError.middleware");

const router = express.Router();

// ==========================================
// All upload routes require a logged-in organizer.
// (No separate role check yet — same pattern the rest
// of the app currently uses via authMiddleware.)
// ==========================================

router.post(
    "/event-image",
    authMiddleware,
    coverImageUpload.single("image"),
    multerErrorHandling,
    uploadEventImage
);

router.post(
    "/offer-image",
    authMiddleware,
    coverImageUpload.single("image"),
    multerErrorHandling,
    uploadOfferImage
);

router.delete(
    "/image",
    authMiddleware,
    deleteCoverImage
);

module.exports = router;
