const multer = require("multer");

const multerErrorHandling = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        let message = err.message;

        if (err.code === "LIMIT_FILE_SIZE") {
            message = "That image is too large. Please choose a smaller file.";
        }

        if (err.code === "LIMIT_UNEXPECTED_FILE") {
            message = "Only JPEG, JPG, or PNG images are allowed.";
        }

        return res.status(400).json({ message });
    }

    if (err) {
        return res.status(400).json({ message: err.message });
    }

    next();
};

module.exports = multerErrorHandling;
