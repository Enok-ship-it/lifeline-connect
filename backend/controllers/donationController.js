// controllers/donationController.js

const Donation = require("../models/Donation");
const { streamCertificate } = require("../utils/certificate");

// GET /api/donations/mine  (protected - donor's own donation history)
async function getMyDonations(req, res) {
  try {
    const donations = await Donation.find({ donor: req.user._id })
      .populate("request", "patientName hospitalName city bloodGroup")
      .sort({ createdAt: -1 });

    res.json({ count: donations.length, donations });
  } catch (err) {
    res.status(500).json({ message: "Could not load your donations.", error: err.message });
  }
}

// GET /api/donations/:id/certificate
// Only the donor who made the donation (or an admin) can download it,
// and only once it's actually marked "completed" - no certificate for
// a pledge that never happened.
async function downloadCertificate(req, res) {
  try {
    const donation = await Donation.findById(req.params.id)
      .populate("donor", "name")
      .populate("request", "patientName hospitalName bloodGroup");

    if (!donation) return res.status(404).json({ message: "Donation not found." });

    const isOwner = String(donation.donor._id) === String(req.user._id);
    if (!isOwner && req.user.role !== "admin") {
      return res.status(403).json({ message: "You can only download your own certificates." });
    }

    if (donation.status !== "completed") {
      return res.status(400).json({ message: "This donation hasn't been confirmed as completed yet." });
    }

    streamCertificate(res, {
      donorName: donation.donor.name,
      bloodGroup: donation.request?.bloodGroup || "—",
      dateDonated: donation.dateDonated.toDateString(),
      hospitalName: donation.request?.hospitalName || "—",
      certificateId: donation._id,
    });
  } catch (err) {
    res.status(500).json({ message: "Could not generate certificate.", error: err.message });
  }
}

module.exports = { getMyDonations, downloadCertificate };
