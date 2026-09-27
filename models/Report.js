const mongoose = require("mongoose");

// Generic reasons that make sense for both events and offers.
const REPORT_REASONS = [
  "Fraud or scam",
  "Misleading or false information",
  "Inappropriate or offensive content",
  "Spam or duplicate listing",
  "Prohibited or illegal content",
  "Other",
];

const reportSchema = new mongoose.Schema(
  {
    targetType: {
      type: String,
      enum: ["Event", "Offer"],
      required: true,
    },

    // refPath lets this point at either the Event or Offer collection
    // depending on targetType.
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "targetType",
    },

    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    reason: {
      type: String,
      enum: REPORT_REASONS,
      required: true,
    },

    details: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null,
    },

    status: {
      type: String,
      enum: ["Pending", "Under Review", "Resolved", "Dismissed"],
      default: "Pending",
    },
  },
  { timestamps: true },
);

// A user can only report the same event/offer once — stops repeat spam
reportSchema.index(
  { reporter: 1, targetType: 1, targetId: 1 },
  { unique: true },
);

const Report = mongoose.model("Report", reportSchema);
Report.REASONS = REPORT_REASONS;

module.exports = Report;
