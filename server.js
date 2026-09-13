const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const fs = require("fs");
require("dotenv").config();

require("./config/cloudinary");

const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const eventRoutes = require("./routes/eventRoutes");

const app = express();

const PORT = process.env.PORT || 5000;


app.use(
    cors({
        origin: "http://localhost:5173",
        credentials: true,
    })
);

app.use(express.json());
app.use(cookieParser());

const uploadsDir = process.env.ENV === "production" ? "/tmp/uploads" : "uploads";

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

mongoose
    .connect(process.env.MONGO_URL)
    .then(() => {
        console.log("MongoDB connected");
    })
    .catch((error) => {
        console.log("MongoDB connection failed:", error);
    });

app.get("/", (req, res) => {
    res.send("Backend is working!");
});

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/offers", require("./routes/offerRoutes"));

//start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});