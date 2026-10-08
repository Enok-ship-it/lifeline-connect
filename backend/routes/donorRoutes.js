// routes/donorRoutes.js
const express = require("express");
const router = express.Router();
const { searchDonors, setAvailability, getLeaderboard } = require("../controllers/donorController");
const { protect } = require("../middleware/auth");

router.get("/search", searchDonors); // public; contact details require an accepted donation
router.get("/leaderboard", getLeaderboard); // public - shown on landing page too
router.patch("/availability", protect, setAvailability); // only the logged-in donor themselves

module.exports = router;
