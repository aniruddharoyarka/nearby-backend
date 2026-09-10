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

        //editable profile fields (text-only for now — no image upload yet)
        username: {
            type: String,
            trim: true,
            lowercase: true,
            unique: true,
            sparse: true,
            default: null,
        },

        about: {
            type: String,
            trim: true,
            default: null,
        },

        website: {
            type: String,
            trim: true,
            default: null,
        },

        address: {
            type: String,
            trim: true,
            default: null,
        },

        area: {
            type: String,
            trim: true,
            default: null,
        },

        city: {
            type: String,
            trim: true,
            default: null,
        },

        division: {
            type: String,
            trim: true,
            default: null,
        },

        facebook: {
            type: String,
            trim: true,
            default: null,
        },

        instagram: {
            type: String,
            trim: true,
            default: null,
        },

        //kept as a string on purpose (this is text-field data, not a
        //number we do arithmetic on)
        establishedYear: {
            type: String,
            trim: true,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

const User = mongoose.model("User", userSchema);

module.exports = User;