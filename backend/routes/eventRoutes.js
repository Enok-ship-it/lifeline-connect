// routes/eventRoutes.js
const express = require("express");
const router = express.Router();
const { listEvents } = require("../controllers/eventController");
const { createEvent } = require("../controllers/adminController");
const { protect, requireVerified } = require("../middleware/auth");

router.get("/", listEvents); // public
router.post("/", protect, requireVerified, createEvent);

module.exports = router;
