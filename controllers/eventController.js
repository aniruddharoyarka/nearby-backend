const Event = require("../models/Event");
const mongoose = require("mongoose");

const organizerFields = "name organizationName";
const serializeListedEvent = (event) => ({
    ...serializeEvent(event),
    organizer: event.organizer ? {
        id: event.organizer._id,
        name: event.organizer.organizationName || event.organizer.name,
    } : null,
});

const getEvents = (admin = false) => async (req, res) => {
    try {
        const events = await Event.find(admin ? {} : { status: "Approved" })
            .populate("organizer", organizerFields).sort({ createdAt: -1 });
        return res.json({ events: events.map(serializeListedEvent) });
    } catch {
        return res.status(500).json({ message: "Failed to fetch events." });
    }
};

const getEvent = async (req, res) => {
    if (!mongoose.isObjectIdOrHexString(req.params.id)) {
        return res.status(404).json({ message: "Event not found." });
    }
    try {
        const event = await Event.findOne({ _id: req.params.id, status: "Approved" })
            .populate("organizer", organizerFields);
        if (!event) return res.status(404).json({ message: "Event not found." });
        return res.json({ event: serializeListedEvent(event) });
    } catch {
        return res.status(500).json({ message: "Failed to fetch event." });
    }
};

const updateEventStatus = async (req, res) => {
    const { status } = req.body;
    if (!["Pending", "Approved", "Rejected"].includes(status)) {
        return res.status(400).json({ message: "Invalid event status." });
    }
    if (!mongoose.isObjectIdOrHexString(req.params.id)) {
        return res.status(404).json({ message: "Event not found." });
    }
    try {
        const event = await Event.findByIdAndUpdate(req.params.id, { status }, {
            new: true, runValidators: true,
        }).populate("organizer", organizerFields);
        if (!event) return res.status(404).json({ message: "Event not found." });
        return res.json({ event: serializeListedEvent(event) });
    } catch {
        return res.status(500).json({ message: "Failed to update event status." });
    }
};

//safe, client-facing shape of an event document
const serializeEvent = (event) => ({
    id: event._id,
    title: event.title,
    category: event.category,
    description: event.description,
    date: event.date,
    time: event.time,
    duration: event.duration,
    location: event.location,
    locationLink: event.locationLink,
    performers: event.performers,
    tickets: event.tickets.map((ticket) => ({
        id: ticket._id,
        name: ticket.name,
        description: ticket.description,
        price: ticket.price,
    })),
    bannerImage: event.bannerImage,
    status: event.status,
    organizer: event.organizer,
    createdAt: event.createdAt,
});

//POST /api/events \u2014 organizer creates a new event. Starts as
//"Pending" and needs admin approval before it's meant to go public
//(matches the status values the admin panel's Events page already
//uses).
const createEvent = async (req, res) => {
    try {
        const {
            title,
            category,
            description,
            date,
            time,
            duration,
            location,
            locationLink,
            performers,
            tickets,
            bannerImage,
        } = req.body;

        if (typeof bannerImage?.url !== "string" || !bannerImage.url.trim() ||
            typeof bannerImage?.publicId !== "string" || !bannerImage.publicId.trim()) {
            return res.status(400).json({ message: "An uploaded banner image is required." });
        }

        //required fields
        if (!title?.trim()) {
            return res.status(400).json({
                message: "Event title is required.",
            });
        }

        if (!category?.trim()) {
            return res.status(400).json({
                message: "Category is required.",
            });
        }

        if (!date?.trim()) {
            return res.status(400).json({
                message: "Date is required.",
            });
        }

        if (!time?.trim()) {
            return res.status(400).json({
                message: "Time is required.",
            });
        }

        if (!location?.trim()) {
            return res.status(400).json({
                message: "Location is required.",
            });
        }

        //tickets \u2014 at least one is required, and each needs a name
        //and a valid non-negative price
        if (!Array.isArray(tickets) || tickets.length === 0) {
            return res.status(400).json({
                message: "At least one ticket type is required.",
            });
        }

        const cleanTickets = [];

        for (const ticket of tickets) {
            const name = ticket?.name?.trim();
            const price = Number(ticket?.price);

            if (!name) {
                return res.status(400).json({
                    message: "Every ticket needs a name.",
                });
            }

            if (Number.isNaN(price) || price < 0) {
                return res.status(400).json({
                    message: `Ticket "${name}" needs a valid price (0 or more).`,
                });
            }

            cleanTickets.push({
                name,
                description: ticket?.description?.trim() || null,
                price,
            });
        }

        //performers \u2014 optional; drop any blank entries
        const cleanPerformers = Array.isArray(performers)
            ? performers
                  .map((performer) =>
                      typeof performer === "string" ? performer.trim() : ""
                  )
                  .filter(Boolean)
            : [];

        const event = await Event.create({
            title: title.trim(),
            category: category.trim(),
            description: description?.trim() || null,
            date: date.trim(),
            time: time.trim(),
            duration: duration?.trim() || null,
            location: location.trim(),
            locationLink: locationLink?.trim() || null,
            performers: cleanPerformers,
            tickets: cleanTickets,
            bannerImage: {
                url: bannerImage?.url || null,
                publicId: bannerImage?.publicId || null,
            },
            //derived from the authenticated session, never from the
            //request body
            organizer: req.user.userId,
        });

        return res.status(201).json({
            message: "Event submitted for review.",
            event: serializeEvent(event),
        });
    } catch (error) {
        console.error("Create event error:", error);

        return res.status(500).json({
            message: "Something went wrong while creating the event.",
        });
    }
};

//GET /api/events/mine \u2014 the logged-in organizer's own events, most
//recent first. Lets the frontend confirm a created event actually
//persisted, even before the wider event-listing pages are wired to
//real data.
const getMyEvents = async (req, res) => {
    try {
        const events = await Event.find({
            organizer: req.user.userId,
        }).sort({ createdAt: -1 });

        return res.status(200).json({
            events: events.map(serializeEvent),
        });
    } catch (error) {
        console.error("Get my events error:", error);

        return res.status(500).json({
            message: "Something went wrong while fetching your events.",
        });
    }
};

module.exports = {
    getEvents,
    getEvent,
    updateEventStatus,
    createEvent,
    getMyEvents,
};
