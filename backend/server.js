// server.js
// This is the entry point - running `node server.js` starts everything.
// It wires together: environment variables -> database -> middleware -> routes.

require("dotenv").config();
const express = require("express");
const http = require("http");
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
const jwt = require("jsonwebtoken");
const { Server: SocketIOServer } = require("socket.io");
const Donation = require("./models/Donation");
const Request = require("./models/Request");
const User = require("./models/User");

const app = express();
const httpServer = http.createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: { origin: process.env.CLIENT_ORIGIN || true },
});

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

// Socket authentication and room authorization keep chat private. A room is
// available only after both participants explicitly accept the donation.
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Authentication required."));
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return next(new Error("Account not found."));
    socket.user = user;
    next();
  } catch (err) {
    next(new Error("Session expired or invalid."));
  }
});

io.on("connection", (socket) => {
  socket.on("chat:join", async ({ donationId } = {}, ack = () => {}) => {
    try {
      const donation = await Donation.findById(donationId).select(
        "donor request donorAccepted requesterAccepted contactRevealedAt"
      );
      if (!donation || !donation.contactRevealedAt || !donation.donorAccepted || !donation.requesterAccepted) {
        return ack({ ok: false, message: "Chat is available only after both participants accept the donation." });
      }

      const request = await Request.findById(donation.request).select("requester");
      const isParticipant =
        String(socket.user._id) === String(donation.donor) ||
        String(socket.user._id) === String(request?.requester);
      if (!isParticipant) return ack({ ok: false, message: "You are not a participant in this donation." });

      socket.join(`donation:${donationId}`);
      ack({ ok: true, room: `donation:${donationId}` });
    } catch (err) {
      ack({ ok: false, message: "Could not join chat." });
    }
  });

  socket.on("chat:message", ({ donationId, text } = {}, ack = () => {}) => {
    const message = String(text || "").trim();
    if (!message || message.length > 1000) {
      return ack({ ok: false, message: "Message must be between 1 and 1000 characters." });
    }

    const room = `donation:${donationId}`;
    if (!socket.rooms.has(room)) return ack({ ok: false, message: "Join an approved donation chat first." });

    io.to(room).emit("chat:message", {
      donationId,
      senderId: String(socket.user._id),
      senderName: socket.user.name,
      text: message,
      sentAt: new Date().toISOString(),
    });
    ack({ ok: true });
  });
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
  httpServer.listen(PORT, () => {
    console.log(`LifeLine Connect server running at http://localhost:${PORT}`);
  });
});
