// controllers/donorController.js

const User = require("../models/User");
const { haversineDistanceKm } = require("../utils/distance");

// Blood type compatibility: who CAN donate to a given blood group.
// e.g. someone who needs A+ can receive from A+, A-, O+, O-
const COMPATIBLE_DONORS = {
  "A+": ["A+", "A-", "O+", "O-"],
  "A-": ["A-", "O-"],
  "B+": ["B+", "B-", "O+", "O-"],
  "B-": ["B-", "O-"],
  "AB+": ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"], // universal recipient
  "AB-": ["A-", "B-", "AB-", "O-"],
  "O+": ["O+", "O-"],
  "O-": ["O-"], // universal donor blood group, but O- patients can only receive O-
};

// GET /api/donors/search?bloodGroup=A+&city=Pune&lat=..&lng=..
// Uses `softAuth` - works for anyone, but includes each donor's phone
// number only if the person searching happens to be logged in. This
// keeps contact details from being scraped by anonymous visitors while
// still letting anyone browse who's available.
async function searchDonors(req, res) {
  try {
    const { bloodGroup, city, lat, lng } = req.query;

    const query = { role: "donor", isAvailable: true };

    if (bloodGroup) {
      const compatible = COMPATIBLE_DONORS[bloodGroup];
      if (!compatible) {
        return res.status(400).json({ message: "Unrecognized blood group." });
      }
      query.bloodGroup = { $in: compatible };
    }

    if (city) {
      // case-insensitive partial match, e.g. "pune" matches "Pune"
      query.city = new RegExp(city, "i");
    }

    // Only reveal contact info to signed-in visitors - anonymous browsers
    // see everything except phone numbers.
    const fieldsToHide = req.user ? "-passwordHash" : "-passwordHash -phone -email";
    let donors = await User.find(query).select(fieldsToHide);

    // If the requester shared coordinates, sort donors by real distance.
    // Otherwise we just leave them in whatever order MongoDB returned.
    if (lat && lng) {
      const reqLat = parseFloat(lat);
      const reqLng = parseFloat(lng);

      donors = donors
        .map((donor) => {
          const donorObj = donor.toObject();
          if (donor.lat != null && donor.lng != null) {
            donorObj.distanceKm = haversineDistanceKm(reqLat, reqLng, donor.lat, donor.lng);
          } else {
            donorObj.distanceKm = null; // unknown - will sort to the end
          }
          return donorObj;
        })
        .sort((a, b) => {
          if (a.distanceKm == null) return 1;
          if (b.distanceKm == null) return -1;
          return a.distanceKm - b.distanceKm;
        });
    }

    res.json({ count: donors.length, donors });
  } catch (err) {
    res.status(500).json({ message: "Search failed.", error: err.message });
  }
}

// PATCH /api/donors/availability   body: { isAvailable: true|false }
async function setAvailability(req, res) {
  try {
    if (req.user.role !== "donor") {
      return res.status(403).json({ message: "Only donors have an availability status." });
    }

    req.user.isAvailable = req.body.isAvailable;
    await req.user.save();

    res.json({ message: "Availability updated.", user: req.user.toSafeObject() });
  } catch (err) {
    res.status(500).json({ message: "Could not update availability.", error: err.message });
  }
}

// GET /api/donors/leaderboard
async function getLeaderboard(req, res) {
  try {
    const topDonors = await User.find({ role: "donor" })
      .sort({ points: -1 })
      .limit(10)
      .select("name city bloodGroup points verified");

    res.json({ leaderboard: topDonors });
  } catch (err) {
    res.status(500).json({ message: "Could not load leaderboard.", error: err.message });
  }
}

module.exports = { searchDonors, setAvailability, getLeaderboard, COMPATIBLE_DONORS };
