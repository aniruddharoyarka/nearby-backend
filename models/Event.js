const mongoose = require("mongoose");

const ticketSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
      default: null,
    },

    //0 = free
    price: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: true },
);

const eventSchema = new mongoose.Schema(
  {
    rejectionReason: { type: String, default: null },
    address: {
      venue: String,
      area: String,
      city: String,
      division: String,
      country: String,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
      default: null,
    },

    date: {
      type: String,
      required: true,
      trim: true,
    },

    time: {
      type: String,
      required: true,
      trim: true,
    },

    duration: {
      type: String,
      trim: true,
      default: null,
    },

    location: {
      type: String,
      required: true,
      trim: true,
    },

    //Google Maps link to the venue
    locationLink: {
      type: String,
      trim: true,
      default: null,
    },

    performers: [
      {
        type: String,
        trim: true,
      },
    ],

    tickets: {
      type: [ticketSchema],
      validate: {
        validator: (tickets) => tickets.length > 0,
        message: "At least one ticket type is required.",
      },
    },

    bannerImage: {
      url: { type: String, required: true, trim: true },
      publicId: { type: String, required: true, trim: true },
    },

    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },

    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

const Event = mongoose.model("Event", eventSchema);

module.exports = Event;
