const express = require("express");

const {
    uploadEventImage,
    uploadOfferImage,
    deleteCoverImage,
} = require("../controllers/uploadController");

const authMiddleware = require("../middleware/authMiddleware");
const requireOrganizer = require("../middleware/requireOrganizer");
const coverImageUpload = require("../middleware/coverImageUpload.middleware");
const multerErrorHandling = require("../middleware/multerError.middleware");

const router = express.Router();

// ==========================================
// Every upload route here requires a logged-in organizer —
// event/offer cover images should only ever be uploaded by
// the organizer creating that event/offer, not by regular
// users or admins.
// ==========================================

router.post(
    "/event-image",
    authMiddleware,
    requireOrganizer,
    coverImageUpload.single("image"),
    multerErrorHandling,
    uploadEventImage
);

router.post(
    "/offer-image",
    authMiddleware,
    requireOrganizer,
    coverImageUpload.single("image"),
    multerErrorHandling,
    uploadOfferImage
);

router.delete(
    "/image",
    authMiddleware,
    requireOrganizer,
    deleteCoverImage
);

module.exports = router;
