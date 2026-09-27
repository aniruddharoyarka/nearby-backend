const mongoose = require("mongoose");
const Report = require("../models/Report");
const Event = require("../models/Event");
const Offer = require("../models/Offer");

const TARGET_MODELS = { Event, Offer };

const STATUSES = ["Pending", "Under Review", "Resolved", "Dismissed"];

const formatDate = (date) =>
    new Date(date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });

const serialize = (report) => ({
    id: report._id,
    type: report.targetType,
    target: report.targetId?.title || "Listing no longer available",
    organizer:
        report.targetId?.organizer?.organizationName ||
        report.targetId?.organizer?.name ||
        "Unknown organizer",
    reportedBy: report.reporter?.name || "Unknown user",
    reason: report.reason,
    description: report.details || "No additional details provided.",
    date: formatDate(report.createdAt),
    status: report.status,
});

const populate = (query) =>
    query
        .populate({
            path: "targetId",
            select: "title organizer",
            populate: { path: "organizer", select: "name organizationName" },
        })
        .populate("reporter", "name");

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

// Admin: every report, newest first.
const list = async (req, res) => {
    try {
        const reports = await populate(
            Report.find({}).sort({ createdAt: -1 }),
        );

        return res.json({ reports: reports.map(serialize) });
    } catch (error) {
        console.error("List reports error:", error);

        return res.status(500).json({ message: "Failed to load reports." });
    }
};

const updateStatus = async (req, res) => {
    if (!STATUSES.includes(req.body.status)) {
        return res.status(400).json({ message: "Invalid report status." });
    }

    if (!mongoose.isObjectIdOrHexString(req.params.id)) {
        return res.status(404).json({ message: "Report not found." });
    }

    try {
        const report = await populate(
            Report.findByIdAndUpdate(
                req.params.id,
                { status: req.body.status },
                { new: true, runValidators: true },
            ),
        );

        if (!report) {
            return res.status(404).json({ message: "Report not found." });
        }

        return res.json({ report: serialize(report) });
    } catch (error) {
        console.error("Update report status error:", error);

        return res
            .status(500)
            .json({ message: "Failed to update report status." });
    }
};

module.exports = {
    create,
    reasons,
    list,
    updateStatus,
};
