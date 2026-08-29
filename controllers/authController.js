const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// ==========================================
// REGISTER USER
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

        // ------------------------------
        // Validate required fields
        // ------------------------------

        if (!name || !email || !password) {
            return res.status(400).json({
                message: "Name, email and password are required.",
            });
        }

        // ------------------------------
        // Validate password length
        // ------------------------------

        if (password.length < 6) {
            return res.status(400).json({
                message: "Password must be at least 6 characters long.",
            });
        }

        // ------------------------------
        // Check if email already exists
        // ------------------------------

        const existingUser = await User.findOne({
            email: email.toLowerCase().trim(),
        });

        if (existingUser) {
            return res.status(409).json({
                message: "An account with this email already exists.",
            });
        }

        // ------------------------------
        // Determine user role
        // ------------------------------

        const userRole = role === "organizer" ? "organizer" : "user";

        // ------------------------------
        // Hash password
        // ------------------------------

        const hashedPassword = await bcrypt.hash(password, 12);

        // ------------------------------
        // Create user
        // ------------------------------

        const user = await User.create({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password: hashedPassword,
            role: userRole,
            organizationName:
                userRole === "organizer"
                    ? organizationName?.trim() || null
                    : null,
            phone: phone?.trim() || null,
        });

        // ------------------------------
        // Response
        // ------------------------------

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
        console.error("Registration error:", error);

        return res.status(500).json({
            message: "Something went wrong while registering.",
        });
    }
};

// ==========================================
// LOGIN USER
// ==========================================

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // ------------------------------
        // Validate input
        // ------------------------------

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required.",
            });
        }

        // ------------------------------
        // Find user
        // ------------------------------

        const user = await User.findOne({
            email: email.toLowerCase().trim(),
        });

        if (!user) {
            return res.status(401).json({
                message: "Invalid email or password.",
            });
        }

        // ------------------------------
        // Compare password
        // ------------------------------

        const isPasswordCorrect = await bcrypt.compare(
            password,
            user.password
        );

        if (!isPasswordCorrect) {
            return res.status(401).json({
                message: "Invalid email or password.",
            });
        }

        // ------------------------------
        // Create JWT
        // ------------------------------

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

        // ------------------------------
        // Response
        // ------------------------------

        return res.status(200).json({
            message: "Login successful.",
            token,
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
        console.error("Login error:", error);

        return res.status(500).json({
            message: "Something went wrong while logging in.",
        });
    }
};

module.exports = {
    register,
    login,
};