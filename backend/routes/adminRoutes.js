// routes/adminRoutes.js
const express = require("express");
const router = express.Router();
const {
  getStats,
  listAllDonors,
  verifyDonor,
  listAllRequests,
  createEvent,
  getAnalytics,
} = require("../controllers/adminController");
const { protect, restrictTo } = require("../middleware/auth");

// Every route below requires the user to be logged in AND have role "admin".
// protect runs first (confirms who they are), restrictTo runs second
// (confirms they're allowed here).
router.use(protect, restrictTo("admin"));

router.get("/stats", getStats);
router.get("/analytics", getAnalytics);
router.get("/donors", listAllDonors);
router.patch("/donors/:id/verify", verifyDonor);
router.get("/requests", listAllRequests);
router.post("/events", createEvent);

module.exports = router;
