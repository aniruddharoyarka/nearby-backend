const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days, matches JWT expiresIn

const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
};

//register organizer
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

        //validate fields
        if (!name || !email || !password) {
            return res.status(400).json({
                message: "Name, email and password are required.",
            });
        }

        //clean input areas
        const cleanName = name.trim();
        const cleanEmail = email.toLowerCase().trim();

        if (!cleanName) {
            return res.status(400).json({
                message: "Name cannot be empty.",
            });
        }

        //validate email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(cleanEmail)) {
            return res.status(400).json({
                message: "Please enter a valid email address.",
            });
        }

        //validate password
        if (password.length < 6) {
            return res.status(400).json({
                message: "Password must be at least 6 characters long.",
            });
        }

        //check existing email
        const existingUser = await User.findOne({
            email: cleanEmail,
        });

        if (existingUser) {
            return res.status(409).json({
                message: "An account with this email already exists.",
            });
        }

        //determine user role
        const userRole =
            role === "organizer"
                ? "organizer"
                : "user";

        //organizer validation
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

        //hashing password using bycrypt
        const hashedPassword = await bcrypt.hash(
            password,
            12
        );

        //create user
        const user = await User.create({
            name: cleanName,
            email: cleanEmail,
            password: hashedPassword,

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

        //response
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

//login
const login = async (req, res) => {
    try {
        const {
            email,
            password,
        } = req.body;

        //validate input 
        if (!email || !password) {
            return res.status(400).json({
                message:
                    "Email and password are required.",
            });
        }

        //clean email
        const cleanEmail =
            email.toLowerCase().trim();

        //find user
        const user = await User.findOne({
            email: cleanEmail,
        });

        if (!user) {
            return res.status(401).json({
                message:
                    "Invalid email or password.",
            });
        }

        //compare password
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

        //create jwt
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

        //set jwt as httpOnly cookie instead of sending it in the response body
        res.cookie("token", token, {
            ...cookieOptions,
            maxAge: TOKEN_MAX_AGE,
        });

        //response
        return res.status(200).json({
            message: "Login successful.",

            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                organizationName:
                    user.organizationName,
                phone: user.phone,
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

const getProfile = async (req, res) => {
    try {
        //find user jwt using userid
        const user = await User.findById(
            req.user.userId
        ).select("-password");

        //user not found
        if (!user) {
            return res.status(404).json({
                message: "User not found.",
            });
        }

        //response
        return res.status(200).json({
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                organizationName:
                    user.organizationName,
                phone: user.phone,
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

//logout
const logout = (req, res) => {
    res.clearCookie("token", cookieOptions);

    return res.status(200).json({
        message: "Logout successful.",
    });
};

module.exports = {
    register,
    login,
    getProfile,
    logout,
};
