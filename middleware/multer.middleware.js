const multer = require("multer");

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
                Math.ceil(Math.random() * 1e5) + fileExtension
        );
    },
});


const fileFilter = (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", file.fieldname));
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB per file
});

module.exports = upload;
