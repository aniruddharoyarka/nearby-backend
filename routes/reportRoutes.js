const express = require("express");

const { create, reasons } = require("../controllers/reportController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/reasons", reasons);

// Submitting a report requires a signed-in account.
router.post("/", authMiddleware, create);

module.exports = router;
