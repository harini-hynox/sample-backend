// server.js
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { createClient } = require("@supabase/supabase-js");

dotenv.config();

const app = express();

// ------------------- MIDDLEWARE -------------------
app.use(
  cors({
    origin: process.env.CLIENT_URL, // ✅ now set from .env
    credentials: true,
  })
);
app.use(express.json());

// ------------------- REQUEST LOGGER -------------------
app.use((req, res, next) => {
  console.log(`➡️ [${req.method}] ${req.originalUrl}`);
  next();
});

// ------------------- SUPABASE -------------------
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ------------------- ROUTES -------------------
try {
  const authRoutes = require("./routes/auth");
  app.use("/api/auth", authRoutes);
  console.log("✅ Auth routes loaded");
} catch (err) {
  console.error("❌ Failed to load auth routes:", err.message);
}

try {
  const taskRoutes = require("./routes/tasks");
  app.use("/api/tasks", taskRoutes);
  console.log("✅ Task routes loaded");
} catch (err) {
  console.error("❌ Failed to load task routes:", err.message);
}

// ✅ FIXED: Avatar routes should also be under /api
const avatarRoutes = require("./routes/Avatar");
app.use("/api/avatar", avatarRoutes);

// ------------------- HEALTH CHECK -------------------
app.get("/", (req, res) => {
  res.send("✅ Backend API is running");
});

// ------------------- START SERVER -------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
