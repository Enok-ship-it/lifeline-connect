// controllers/adminController.js

const User = require("../models/User");
const Request = require("../models/Request");
const Event = require("../models/Event");
const Donation = require("../models/Donation");

// GET /api/admin/stats  - quick numbers for the admin dashboard homepage
async function getStats(req, res) {
  try {
    const [totalDonors, verifiedDonors, openRequests, fulfilledRequests] = await Promise.all([
      User.countDocuments({ role: "donor" }),
      User.countDocuments({ role: "donor", verified: true }),
      Request.countDocuments({ status: "open" }),
      Request.countDocuments({ status: "fulfilled" }),
    ]);

    res.json({ totalDonors, verifiedDonors, openRequests, fulfilledRequests });
  } catch (err) {
    res.status(500).json({ message: "Could not load stats.", error: err.message });
  }
}

// GET /api/admin/donors
async function listAllDonors(req, res) {
  try {
    const donors = await User.find({ role: "donor" }).select("-passwordHash").sort({ createdAt: -1 });
    res.json({ count: donors.length, donors });
  } catch (err) {
    res.status(500).json({ message: "Could not load donors.", error: err.message });
  }
}

// PATCH /api/admin/donors/:id/verify
async function verifyDonor(req, res) {
  try {
    const donor = await User.findById(req.params.id);
    if (!donor) return res.status(404).json({ message: "Donor not found." });

    donor.verified = true;
    await donor.save();

    res.json({ message: `${donor.name} is now a verified donor.`, donor: donor.toSafeObject() });
  } catch (err) {
    res.status(500).json({ message: "Could not verify donor.", error: err.message });
  }
}

// GET /api/admin/requests
async function listAllRequests(req, res) {
  try {
    const requests = await Request.find().populate("requester", "name phone email").sort({ createdAt: -1 });
    res.json({ count: requests.length, requests });
  } catch (err) {
    res.status(500).json({ message: "Could not load requests.", error: err.message });
  }
}

// POST /api/admin/events
async function createEvent(req, res) {
  try {
    const { title, date, location, organizerName, description } = req.body;
    if (!title || !date || !location || !organizerName) {
      return res.status(400).json({ message: "Please fill in all required fields." });
    }

    const event = await Event.create({ title, date, location, organizerName, description });
    res.status(201).json({ event });
  } catch (err) {
    res.status(500).json({ message: "Could not create event.", error: err.message });
  }
}

// GET /api/admin/analytics - powers the two charts on the admin overview page.
// Deliberately done with plain JS grouping (not a MongoDB aggregation
// pipeline) since the dataset is small and this is far easier to explain
// line-by-line in a viva than an aggregation pipeline would be.
async function getAnalytics(req, res) {
  try {
    const requests = await Request.find().select("bloodGroup");
    const donations = await Donation.find({ status: "completed" }).select("dateDonated");

    const requestsByBloodGroup = {};
    for (const r of requests) {
      requestsByBloodGroup[r.bloodGroup] = (requestsByBloodGroup[r.bloodGroup] || 0) + 1;
    }

    const donationsByMonth = {};
    for (const d of donations) {
      if (!d.dateDonated) continue;
      const key = d.dateDonated.toISOString().slice(0, 7); // "YYYY-MM"
      donationsByMonth[key] = (donationsByMonth[key] || 0) + 1;
    }

    res.json({
      requestsByBloodGroup, // e.g. { "A+": 3, "O+": 5 }
      donationsByMonth, // e.g. { "2026-08": 2, "2026-09": 4 }
    });
  } catch (err) {
    res.status(500).json({ message: "Could not load analytics.", error: err.message });
  }
}

module.exports = { getStats, listAllDonors, verifyDonor, listAllRequests, createEvent, getAnalytics };
