const mongoose = require("mongoose");
const requiredText = { type: String, required: true, trim: true };
const schema = new mongoose.Schema(
  {
    rejectionReason: { type: String, default: null },
    address: {
      venue: String,
      area: String,
      city: String,
      division: String,
      country: String,
    },
    title: requiredText,
    category: requiredText,
    location: requiredText,
    date: requiredText,
    time: requiredText,
    validUntil: requiredText,
    description: requiredText,
    redemption: requiredText,
    originalPrice: { type: Number, required: true, min: 0 },
    discountPercent: { type: Number, required: true, min: 0, max: 100 },
    bannerImage: { url: requiredText, publicId: requiredText },
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },
  },
  { timestamps: true },
);
module.exports = mongoose.model("Offer", schema);
