// server.js
// This is the entry point - running `node server.js` starts everything.
// It wires together: environment variables -> database -> middleware -> routes.

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");
const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const donorRoutes = require("./routes/donorRoutes");
const requestRoutes = require("./routes/requestRoutes");
const adminRoutes = require("./routes/adminRoutes");
const eventRoutes = require("./routes/eventRoutes");
const donationRoutes = require("./routes/donationRoutes");

const app = express();

// ---- Middleware (runs on every request, in order) ----
// helmet sets a batch of security-related HTTP headers (e.g. stops the
// site from being embedded in a hidden iframe elsewhere, blocks the
// browser from guessing content types). contentSecurityPolicy is turned
// off here only because it would otherwise block the Google Fonts and
// Chart.js CDN scripts our plain HTML pages load directly.
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors()); // allows the frontend (different port/origin) to call this API
app.use(express.json()); // parses incoming JSON request bodies into req.body

// Rate limiting on auth routes specifically - slows down anyone trying to
// brute-force a password by hammering /login with guesses. 20 attempts
// per 15 minutes per IP is generous for a real user, painful for a script.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: "Too many attempts from this device. Please try again in a few minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/auth", authLimiter);

// ---- Serve the frontend static files ----
// This means you can run ONE server and open http://localhost:5000
// directly - no separate frontend server needed for development or demo.
app.use(express.static(path.join(__dirname, "..", "frontend")));

// ---- API routes ----
app.use("/api/auth", authRoutes);
app.use("/api/donors", donorRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/donations", donationRoutes);

// Simple health check - useful for confirming the server is alive,
// and for your deployment platform (Render/Railway) to ping.
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// ---- Catch-all error handler ----
// If any route throws an unexpected error we didn't already catch,
// this stops the server from crashing and sends a clean response instead.
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong on our end." });
});

const PORT = process.env.PORT || 5000;
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`LifeLine Connect server running at http://localhost:${PORT}`);
  });
});
