const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },

        password: {
            type: String,
            required: true,
        },

        role: {
            type: String,
            enum: ["user", "organizer", "admin"],
            default: "user",
        },

        status: {
            type: String,
            enum: ["Active", "Suspended", "Approved", "Pending"],
            default: function () {
                return this.role === "organizer"
                    ? "Approved"
                    : "Active";
            },
        },

        organizationName: {
            type: String,
            trim: true,
            default: null,
        },

        phone: {
            type: String,
            trim: true,
            default: null,
        },

        profilePicture: {
            url: { type: String, default: null },
            publicId: { type: String, default: null },
        },
    },
    {
        timestamps: true,
    }
);

const User = mongoose.model("User", userSchema);

module.exports = User;