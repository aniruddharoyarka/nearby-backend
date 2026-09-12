const express = require("express");

const { createEvent, getMyEvents, getEvents, getEvent } = require("../controllers/eventController");

const authMiddleware = require("../middleware/authMiddleware");
const requireOrganizer = require("../middleware/requireOrganizer");

const router = express.Router();

// Public reads expose only approved events; writes and /mine require an organizer.
router.get("/", getEvents());

router.post("/", authMiddleware, requireOrganizer, createEvent);

router.get("/mine", authMiddleware, requireOrganizer, getMyEvents);
router.get("/:id", getEvent);

module.exports = router;
