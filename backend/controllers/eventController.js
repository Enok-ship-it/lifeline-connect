// controllers/eventController.js

const Event = require("../models/Event");

// GET /api/events - public list, soonest first
async function listEvents(req, res) {
  try {
    const events = await Event.find({ date: { $gte: new Date() } }).sort({ date: 1 });
    res.json({ count: events.length, events });
  } catch (err) {
    res.status(500).json({ message: "Could not load events.", error: err.message });
  }
}

module.exports = { listEvents };
