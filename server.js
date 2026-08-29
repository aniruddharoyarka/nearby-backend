const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");

const app = express();

const PORT = process.env.PORT || 5000;

// ==============================
// MIDDLEWARE
// ==============================

app.use(
    cors({
        origin: "http://localhost:5173",
    })
);

app.use(express.json());

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

// ==============================
// START SERVER
// ==============================

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});