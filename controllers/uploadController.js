const cloudinary = require("../config/cloudinary");
const deleteFiles = require("../utils/deleteFiles");

const FOLDERS = {
    event: "nearby/events",
    offer: "nearby/offers",
};


const uploadCoverImage = (type) => async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                message: "An image file is required.",
            });
        }

        const result = await cloudinary.uploader.upload(req.file.path, {
            folder: FOLDERS[type],
        });

        return res.status(200).json({
            message: "Image uploaded.",
            url: result.secure_url,
            publicId: result.public_id,
        });

    } catch (error) {
        console.error(
            "Cover image upload error:",
            error
        );

        return res.status(500).json({
            message:
                "Something went wrong while uploading the image.",
        });
    } finally {
        if (req.file) {
            deleteFiles([req.file.path]);
        }
    }
};

const uploadEventImage = uploadCoverImage("event");
const uploadOfferImage = uploadCoverImage("offer");

const deleteCoverImage = async (req, res) => {
    try {
        const { publicId } = req.body;

        if (!publicId) {
            return res.status(400).json({
                message: "publicId is required.",
            });
        }

        await cloudinary.uploader.destroy(publicId);

        return res.status(200).json({
            message: "Image deleted.",
        });

    } catch (error) {
        console.error(
            "Cover image delete error:",
            error
        );

        return res.status(500).json({
            message:
                "Something went wrong while deleting the image.",
        });
    }
};

module.exports = {
    uploadEventImage,
    uploadOfferImage,
    deleteCoverImage,
};
