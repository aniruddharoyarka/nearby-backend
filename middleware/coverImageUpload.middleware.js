const multer = require("multer");

// ==========================================
// EVENT / OFFER COVER IMAGE UPLOADS
//
// Separate from middleware/multer.middleware.js (which is used
// for profile pictures and allows webp). This one is stricter:
// jpeg/jpg/png only, per organizer cover image requirements.
// ==========================================

// Change this single number to adjust the max allowed cover
// image size everywhere (events + offers). Bumped from 1MB to 5MB —
// event/offer banners are hero images and deserve better quality than
// a 1MB cap allows. Keep this in sync with
// nearby/src/services/uploadService.js's MAX_IMAGE_SIZE_MB.
const MAX_IMAGE_SIZE_MB = 5;

const dir = process.env.ENV === "production" ? "/tmp/uploads" : "uploads";

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, dir);
    },

    filename: (req, file, cb) => {
        let fileExtension = "";

        if (file.originalname.split(".").length > 1) {
            fileExtension = file.originalname.substring(
                file.originalname.lastIndexOf(".")
            );
        }

        const filenameWithoutExtension = file.originalname
            .toLowerCase()
            .split(" ")
            .join("-")
            ?.split(".")[0];

        cb(
            null,
            filenameWithoutExtension +
                "-" +
                Date.now() +
                Math.ceil(Math.random() * 1e5) + // avoid rare name conflicts
                fileExtension
        );
    },
});

// ==========================================
// jpeg / jpg / png ONLY — no webp, no gif, etc.
// ==========================================

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png"];

const fileFilter = (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", file.fieldname));
    }
};

const coverImageUpload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: MAX_IMAGE_SIZE_MB * 1024 * 1024 },
});

module.exports = coverImageUpload;
module.exports.MAX_IMAGE_SIZE_MB = MAX_IMAGE_SIZE_MB;
