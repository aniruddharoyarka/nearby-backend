const fs = require("fs");

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
