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

//every route here is admin-only: verify the JWT first, then require
//the "admin" role before any handler runs
router.use(authMiddleware, requireAdmin);

router.get("/stats", getStats);

router.get("/users", getUsers);
router.patch("/users/:id/status", updateUserStatus);

router.get("/organizers", getOrganizers);
router.patch("/organizers/:id/status", updateOrganizerStatus);

module.exports = router;
