const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const cloudinary = require("../config/cloudinary");
const deleteFiles = require("../utils/deleteFiles");

// ==========================================
// REGISTER USER / ORGANIZER
// ==========================================

const register = async (req, res) => {
    try {
        const {
            name,
            email,
            password,
            role,
            organizationName,
            phone,
        } = req.body;

        // ==========================================
        // Validate required fields
        // ==========================================

        if (!name || !email || !password) {
            return res.status(400).json({
                message: "Name, email and password are required.",
            });
        }

        // ==========================================
        // Clean input
        // ==========================================

        const cleanName = name.trim();
        const cleanEmail = email.toLowerCase().trim();

        if (!cleanName) {
            return res.status(400).json({
                message: "Name cannot be empty.",
            });
        }

        // ==========================================
        // Validate email
        // ==========================================

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(cleanEmail)) {
            return res.status(400).json({
                message: "Please enter a valid email address.",
            });
        }

        // ==========================================
        // Validate password length
        // ==========================================

        if (password.length < 6) {
            return res.status(400).json({
                message: "Password must be at least 6 characters long.",
            });
        }

        // ==========================================
        // Check if email already exists
        // ==========================================

        const existingUser = await User.findOne({
            email: cleanEmail,
        });

        if (existingUser) {
            return res.status(409).json({
                message: "An account with this email already exists.",
            });
        }

        // ==========================================
        // Determine user role
        //
        // IMPORTANT:
        //
        // Public registration can ONLY create:
        // - user
        // - organizer
        //
        // "admin" is NEVER accepted from req.body.
        // ==========================================

        const userRole =
            role === "organizer"
                ? "organizer"
                : "user";

        // ==========================================
        // Organizer-specific validation
        // ==========================================

        let cleanOrganizationName = null;
        let cleanPhone = null;

        if (userRole === "organizer") {
            cleanOrganizationName =
                organizationName?.trim() || null;

            cleanPhone =
                phone?.trim() || null;

            if (!cleanOrganizationName) {
                return res.status(400).json({
                    message:
                        "Organization or business name is required for organizers.",
                });
            }

            if (!cleanPhone) {
                return res.status(400).json({
                    message:
                        "Phone number is required for organizers.",
                });
            }
        }

        // ==========================================
        // Hash password
        // ==========================================

        const hashedPassword = await bcrypt.hash(
            password,
            12
        );

        // ==========================================
        // Create user
        // ==========================================

        const user = await User.create({
            name: cleanName,
            email: cleanEmail,
            password: hashedPassword,

            // NEVER use:
            // role: req.body.role

            role: userRole,

            organizationName:
                userRole === "organizer"
                    ? cleanOrganizationName
                    : null,

            phone:
                userRole === "organizer"
                    ? cleanPhone
                    : null,
        });

        // ==========================================
        // Response
        // ==========================================

        return res.status(201).json({
            message: "Registration successful.",

            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                organizationName: user.organizationName,
                phone: user.phone,
            },
        });

    } catch (error) {
        console.error(
            "Registration error:",
            error
        );

        return res.status(500).json({
            message:
                "Something went wrong while registering.",
        });
    }
};


// ==========================================
// LOGIN USER / ORGANIZER / ADMIN
// ==========================================

const login = async (req, res) => {
    try {
        const {
            email,
            password,
        } = req.body;

        // ==========================================
        // Validate input
        // ==========================================

        if (!email || !password) {
            return res.status(400).json({
                message:
                    "Email and password are required.",
            });
        }

        // ==========================================
        // Clean email
        // ==========================================

        const cleanEmail =
            email.toLowerCase().trim();

        // ==========================================
        // Find user
        // ==========================================

        const user = await User.findOne({
            email: cleanEmail,
        });

        if (!user) {
            return res.status(401).json({
                message:
                    "Invalid email or password.",
            });
        }

        // ==========================================
        // Compare password
        // ==========================================

        const isPasswordCorrect =
            await bcrypt.compare(
                password,
                user.password
            );

        if (!isPasswordCorrect) {
            return res.status(401).json({
                message:
                    "Invalid email or password.",
            });
        }

        // ==========================================
        // Create JWT
        // ==========================================

        const token = jwt.sign(
            {
                userId: user._id,
                role: user.role,
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "7d",
            }
        );

        // ==========================================
        // Response
        // ==========================================

        return res.status(200).json({
            message: "Login successful.",

            token,

            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                organizationName:
                    user.organizationName,
                phone: user.phone,
                profilePicture: user.profilePicture,
            },
        });

    } catch (error) {
        console.error(
            "Login error:",
            error
        );

        return res.status(500).json({
            message:
                "Something went wrong while logging in.",
        });
    }
};


// ==========================================
// GET AUTHENTICATED USER PROFILE
// ==========================================

const getProfile = async (req, res) => {
    try {
        // ==========================================
        // Find user using JWT userId
        // ==========================================

        const user = await User.findById(
            req.user.userId
        ).select("-password");

        // ==========================================
        // User not found
        // ==========================================

        if (!user) {
            return res.status(404).json({
                message: "User not found.",
            });
        }

        // ==========================================
        // Response
        // ==========================================

        return res.status(200).json({
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                organizationName:
                    user.organizationName,
                phone: user.phone,
                profilePicture: user.profilePicture,
                createdAt:
                    user.createdAt,
            },
        });

    } catch (error) {
        console.error(
            "Get profile error:",
            error
        );

        return res.status(500).json({
            message:
                "Something went wrong while getting profile.",
        });
    }
};


// ==========================================
// UPLOAD / UPDATE PROFILE PICTURE
// ==========================================

const uploadProfilePicture = async (req, res) => {
    try {
        // ==========================================
        // Validate file presence
        // ==========================================

        if (!req.file) {
            return res.status(400).json({
                message: "Profile picture image is required.",
            });
        }

        const user = await User.findById(req.user.userId);

        if (!user) {
            deleteFiles([req.file.path]);

            return res.status(404).json({
                message: "User not found.",
            });
        }

        // ==========================================
        // Remove old picture from Cloudinary, if any
        // ==========================================

        if (user.profilePicture?.publicId) {
            await cloudinary.uploader.destroy(
                user.profilePicture.publicId
            );
        }

        // ==========================================
        // Upload new picture
        // ==========================================

        const result = await cloudinary.uploader.upload(req.file.path, {
            folder: "nearby/profile_pictures",
        });

        user.profilePicture = {
            url: result.secure_url,
            publicId: result.public_id,
        };

        await user.save();

        return res.status(200).json({
            message: "Profile picture updated.",
            profilePicture: user.profilePicture,
        });

    } catch (error) {
        console.error(
            "Upload profile picture error:",
            error
        );

        return res.status(500).json({
            message:
                "Something went wrong while uploading the profile picture.",
        });
    } finally {
        if (req.file) {
            deleteFiles([req.file.path]);
        }
    }
};


// ==========================================
// DELETE PROFILE PICTURE
// ==========================================

const deleteProfilePicture = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);

        if (!user) {
            return res.status(404).json({
                message: "User not found.",
            });
        }

        if (!user.profilePicture?.publicId) {
            return res.status(400).json({
                message: "No profile picture to delete.",
            });
        }

        await cloudinary.uploader.destroy(
            user.profilePicture.publicId
        );

        user.profilePicture = { url: null, publicId: null };

        await user.save();

        return res.status(200).json({
            message: "Profile picture removed.",
        });

    } catch (error) {
        console.error(
            "Delete profile picture error:",
            error
        );

        return res.status(500).json({
            message:
                "Something went wrong while deleting the profile picture.",
        });
    }
};


// ==========================================
// EXPORT
// ==========================================

module.exports = {
    register,
    login,
    getProfile,
    uploadProfilePicture,
    deleteProfilePicture,
};
