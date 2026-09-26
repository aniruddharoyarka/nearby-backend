const express = require("express");

const { create, reasons } = require("../controllers/reportController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Reason list is public so the frontend can render the checkboxes without
// needing to be logged in yet.
router.get("/reasons", reasons);

// Submitting a report requires a signed-in account.
router.post("/", authMiddleware, create);

module.exports = router;
