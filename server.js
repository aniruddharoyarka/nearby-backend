const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const fs = require("fs");
require("dotenv").config();

require("./config/cloudinary");

const authRoutes = require("./routes/authRoutes");
const uploadRoutes = require("./routes/uploadRoutes");

const app = express();

const PORT = process.env.PORT || 5000;

// ==============================
// MIDDLEWARE
// ==============================

app.use(
    cors({
        origin: "http://localhost:5173",
        credentials: true,
    })
);

app.use(express.json());

// ==============================
// TEMP UPLOADS DIRECTORY
// (used by multer before files are pushed to Cloudinary)
// ==============================

const uploadsDir = process.env.ENV === "production" ? "/tmp/uploads" : "uploads";

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// ==============================
// MONGODB CONNECTION
// ==============================

mongoose
    .connect(process.env.MONGO_URL)
    .then(() => {
        console.log("MongoDB connected");
    })
    .catch((error) => {
        console.log("MongoDB connection failed:", error);
    });

// ==============================
// ROUTES
// ==============================

app.get("/", (req, res) => {
    res.send("Backend is working!");
});

app.use("/api/auth", authRoutes);
app.use("/api/upload", uploadRoutes);

// ==============================
// START SERVER
// ==============================

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});