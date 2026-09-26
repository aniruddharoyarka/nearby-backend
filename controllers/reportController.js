const mongoose = require("mongoose");
const Report = require("../models/Report");
const Event = require("../models/Event");
const Offer = require("../models/Offer");

const TARGET_MODELS = { Event, Offer };

// Anyone signed in (user, organizer or admin) can report an event or offer.
const create = async (req, res) => {
    const targetType =
        req.body.targetType === "Event" || req.body.targetType === "Offer"
            ? req.body.targetType
            : null;

    if (!targetType) {
        return res.status(400).json({ message: "Invalid report target." });
    }

    if (!mongoose.isObjectIdOrHexString(req.body.targetId)) {
        return res.status(400).json({ message: "Invalid report target." });
    }

    const reason =
        typeof req.body.reason === "string" ? req.body.reason.trim() : "";

    if (!Report.REASONS.includes(reason)) {
        return res.status(400).json({ message: "Please choose a valid reason." });
    }

    const details =
        typeof req.body.details === "string"
            ? req.body.details.trim().slice(0, 500)
            : "";

    try {
        // Only let people report listings that are actually live on the site.
        const target = await TARGET_MODELS[targetType]
            .findOne({ _id: req.body.targetId, status: "Approved" })
            .select("_id");

        if (!target) {
            return res
                .status(404)
                .json({ message: `${targetType} not found.` });
        }

        const report = await Report.create({
            targetType,
            targetId: req.body.targetId,
            reporter: req.user.userId,
            reason,
            details: details || null,
        });

        return res.status(201).json({
            message: "Thanks — your report has been submitted for review.",
            reportId: report._id,
        });
    } catch (error) {
        // Duplicate key error = this user already reported this listing.
        if (error.code === 11000) {
            return res.status(409).json({
                message: "You've already reported this. Our team will review it.",
            });
        }

        console.error("Create report error:", error);

        return res.status(500).json({
            message: "Something went wrong while submitting your report.",
        });
    }
};

const reasons = (req, res) => {
    return res.json({ reasons: Report.REASONS });
};

module.exports = {
    create,
    reasons,
};
