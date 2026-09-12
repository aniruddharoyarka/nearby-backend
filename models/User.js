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

        //admin moderation status. Users are Active by default; organizers
        //are Approved by default since registering already grants full
        //access today (there's no approval gate at signup yet) — this
        //field just gives the admin panel something real to read and
        //toggle instead of the dummy data it had before.
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