// routes/requestRoutes.js
const express = require("express");
const router = express.Router();
const {
  createRequest,
  listRequests,
  getRequest,
  pledgeToRequest,
  getPledgesForRequest,
  acceptPledge,
  completeDonation,
} = require("../controllers/requestController");
const { protect } = require("../middleware/auth");

router.get("/", listRequests); // public - anyone can see open emergency requests
router.get("/:id", getRequest);
router.post("/", protect, createRequest);
router.post("/:id/pledge", protect, pledgeToRequest);
router.get("/:id/pledges", protect, getPledgesForRequest); // requester-only, checked inside the controller
router.patch("/:id/pledges/:donationId/accept", protect, acceptPledge);
router.patch("/:id/complete-donation", protect, completeDonation);

module.exports = router;
