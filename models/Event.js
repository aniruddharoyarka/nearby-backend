const mongoose = require("mongoose");

// A single ticket type an organizer offers for an event
// (e.g. "General Admission" / "VIP"). An event can have several.
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
    { _id: true }
);

const eventSchema = new mongoose.Schema(
    {
        rejectionReason: { type: String, default: null },
address: { venue: String, area: String, city: String, division: String, country: String },
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

        //kept as display strings ("17 Oct", "7:00 PM - 10:00 PM") to
        //match how the rest of the app already presents dates/times,
        //rather than a real Date type
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

        //moderation status \u2014 same three values the admin panel's
        //Events page already expects (see components/admin/EventsTable.jsx)
        status: {
            type: String,
            enum: ["Pending", "Approved", "Rejected"],
            default: "Pending",
        },

        //the organizer who created this event. Derived from the
        //authenticated session on create \u2014 never trusted from the
        //request body \u2014 so an organizer can't claim someone else's
        //identity on an event.
        organizer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

const Event = mongoose.model("Event", eventSchema);

module.exports = Event;
