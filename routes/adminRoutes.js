const express = require("express");

const {
    getUsers,
    getOrganizers,
    getStats,
    updateUserStatus,
    updateOrganizerStatus,
} = require("../controllers/adminController");

const authMiddleware = require("../middleware/authMiddleware");
const requireAdmin = require("../middleware/requireAdmin");

const router = express.Router();
const { getEvents, updateEventStatus } = require("../controllers/eventController");

router.use(authMiddleware, requireAdmin);
const offers = require("../controllers/offerController");
router.get("/offers", offers.list("admin"));
router.patch("/offers/:id/status", offers.moderate);
router.get("/events", getEvents(true));
router.patch("/events/:id/status", updateEventStatus);

router.get("/stats", getStats);

router.get("/users", getUsers);
router.patch("/users/:id/status", updateUserStatus);

router.get("/organizers", getOrganizers);
router.patch("/organizers/:id/status", updateOrganizerStatus);

module.exports = router;
