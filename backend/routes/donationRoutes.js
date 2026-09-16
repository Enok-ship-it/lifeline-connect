// routes/donationRoutes.js
const express = require("express");
const router = express.Router();
const { getMyDonations, downloadCertificate } = require("../controllers/donationController");
const { protect } = require("../middleware/auth");

router.get("/mine", protect, getMyDonations);
router.get("/:id/certificate", protect, downloadCertificate);

module.exports = router;
