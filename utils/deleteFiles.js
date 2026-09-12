const fs = require("fs");

// ==========================================
// DELETE LOCAL TEMP FILES AFTER THEY'VE BEEN
// UPLOADED TO CLOUDINARY (OR IF UPLOAD FAILED)
// ==========================================

const deleteFiles = (paths) => {
    paths.forEach((filePath) => {
        fs.unlink(filePath, (err) => {
            if (err) {
                console.error("Failed to delete temp file:", filePath, err);
            }
        });
    });
};

module.exports = deleteFiles;
