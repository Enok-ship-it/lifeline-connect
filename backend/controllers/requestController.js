// controllers/requestController.js

const Request = require("../models/Request");
const Donation = require("../models/Donation");
const User = require("../models/User");
const { COMPATIBLE_DONORS } = require("./donorController");
const { sendEmail } = require("../utils/mailer");

// POST /api/requests
async function createRequest(req, res) {
  try {
    const { patientName, bloodGroup, unitsNeeded, hospitalName, city, area, lat, lng, urgency, notes } = req.body;

    if (!patientName || !bloodGroup || !hospitalName || !city) {
      return res.status(400).json({ message: "Please fill in all required fields." });
    }

    const request = await Request.create({
      requester: req.user._id,
      patientName,
      bloodGroup,
      unitsNeeded,
      hospitalName,
      city,
      area,
      lat,
      lng,
      urgency,
      notes,
    });

    res.status(201).json({ request });

    // Notify matching, available donors AFTER responding to the requester -
    // the requester shouldn't have to wait for every email to send before
    // their "request posted" confirmation shows up.
    notifyMatchingDonors(request).catch((err) =>
      console.error("Donor notification batch failed:", err.message)
    );
  } catch (err) {
    res.status(500).json({ message: "Could not create request.", error: err.message });
  }
}

// Finds compatible, available donors in the same city and emails each one.
// Kept as its own function so it's easy to point to in a viva: "this is
// the function that fires when a request is posted."
async function notifyMatchingDonors(request) {
  const compatibleGroups = COMPATIBLE_DONORS[request.bloodGroup] || [];

  const donors = await User.find({
    role: "donor",
    isAvailable: true,
    bloodGroup: { $in: compatibleGroups },
    city: new RegExp(request.city, "i"),
  });

  for (const donor of donors) {
    await sendEmail({
      to: donor.email,
      subject: `Urgent: ${request.bloodGroup} blood needed near you`,
      text:
        `Hi ${donor.name},\n\n` +
        `${request.patientName} needs ${request.unitsNeeded} unit(s) of ${request.bloodGroup} blood ` +
        `at ${request.hospitalName}, ${request.city}.\n\n` +
        `If you're able to help, log in to LifeLine Connect and pledge to donate.\n\n` +
        `— LifeLine Connect`,
    });
  }
}

// GET /api/requests?status=open&bloodGroup=A+&city=Pune
async function listRequests(req, res) {
  try {
    const { status, bloodGroup, city } = req.query;
    const query = {};

    if (status) query.status = status;
    if (bloodGroup) query.bloodGroup = bloodGroup;
    if (city) query.city = new RegExp(city, "i");

    const requests = await Request.find(query)
      .populate("requester", "name phone")
      .sort({ urgency: 1, createdAt: -1 }); // newest + most urgent first

    res.json({ count: requests.length, requests });
  } catch (err) {
    res.status(500).json({ message: "Could not load requests.", error: err.message });
  }
}

// GET /api/requests/:id
async function getRequest(req, res) {
  try {
    const request = await Request.findById(req.params.id).populate("requester", "name phone");
    if (!request) return res.status(404).json({ message: "Request not found." });
    res.json({ request });
  } catch (err) {
    res.status(500).json({ message: "Could not load request.", error: err.message });
  }
}

// POST /api/requests/:id/pledge   (donor pledges to donate for this request)
async function pledgeToRequest(req, res) {
  try {
    if (req.user.role !== "donor") {
      return res.status(403).json({ message: "Only donors can pledge to a request." });
    }

    const request = await Request.findById(req.params.id).populate("requester", "name email");
    if (!request) return res.status(404).json({ message: "Request not found." });
    if (request.status !== "open") {
      return res.status(400).json({ message: "This request is no longer open." });
    }

    const donation = await Donation.create({
      donor: req.user._id,
      request: request._id,
      status: "pledged",
    });

    res.status(201).json({ message: "Pledge recorded. The requester will be notified.", donation });

    if (request.requester?.email) {
      sendEmail({
        to: request.requester.email,
        subject: `${req.user.name} pledged to donate for ${request.patientName}`,
        text:
          `Hi ${request.requester.name},\n\n` +
          `${req.user.name} (${req.user.bloodGroup}) has pledged to donate for your request ` +
          `for ${request.patientName} at ${request.hospitalName}.\n\n` +
          `Log in to LifeLine Connect to view their contact details and confirm the donation once completed.\n\n` +
          `— LifeLine Connect`,
      }).catch((err) => console.error("Pledge notification failed:", err.message));
    }
  } catch (err) {
    res.status(500).json({ message: "Could not record pledge.", error: err.message });
  }
}

// GET /api/requests/:id/pledges  - only the requester who posted it (or an admin) can see who pledged
async function getPledgesForRequest(req, res) {
  try {
    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Request not found." });

    const isOwner = String(request.requester) === String(req.user._id);
    if (!isOwner && req.user.role !== "admin") {
      return res.status(403).json({ message: "Only the requester can view pledges for this request." });
    }

    const pledges = await Donation.find({ request: request._id })
      .populate("donor", "name phone bloodGroup verified")
      .sort({ createdAt: 1 });

    res.json({ count: pledges.length, pledges });
  } catch (err) {
    res.status(500).json({ message: "Could not load pledges.", error: err.message });
  }
}

// PATCH /api/requests/:id/complete-donation
// body: { donationId } - marks a pledge as completed, awards points,
// updates the donor's lastDonationDate, and closes the request.
// Only the requester who owns the request (or an admin) can confirm this -
// otherwise anyone with a login could award points to any donor.
async function completeDonation(req, res) {
  try {
    const { donationId } = req.body;

    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Request not found." });

    const isOwner = String(request.requester) === String(req.user._id);
    if (!isOwner && req.user.role !== "admin") {
      return res.status(403).json({ message: "Only the requester can confirm a completed donation." });
    }

    const donation = await Donation.findById(donationId);
    if (!donation) return res.status(404).json({ message: "Donation record not found." });

    donation.status = "completed";
    donation.dateDonated = new Date();
    await donation.save();

    const donor = await User.findById(donation.donor);
    donor.points += 10;
    donor.lastDonationDate = new Date();
    donor.isAvailable = false; // simple cooldown - they can toggle this back on later
    await donor.save();

    request.status = "fulfilled";
    await request.save();

    res.json({ message: "Donation marked complete. Thank you!", donation, donor: donor.toSafeObject() });

    sendEmail({
      to: donor.email,
      subject: "Thank you for your donation!",
      text:
        `Hi ${donor.name},\n\n` +
        `Your donation for ${request.patientName} at ${request.hospitalName} has been confirmed. ` +
        `You've earned 10 points and a spot on the leaderboard. Log in to download your certificate of appreciation.\n\n` +
        `— LifeLine Connect`,
    }).catch((err) => console.error("Thank-you email failed:", err.message));
  } catch (err) {
    res.status(500).json({ message: "Could not complete donation.", error: err.message });
  }
}

module.exports = {
  createRequest,
  listRequests,
  getRequest,
  pledgeToRequest,
  getPledgesForRequest,
  completeDonation,
};
