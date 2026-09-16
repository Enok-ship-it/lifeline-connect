// models/Donation.js
// Records every time a donor pledges to (or actually does) donate for a
// request. This is what powers the leaderboard and donation history.

const mongoose = require("mongoose");

const donationSchema = new mongoose.Schema(
  {
    donor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    request: { type: mongoose.Schema.Types.ObjectId, ref: "Request", required: true },

    status: {
      type: String,
      enum: ["pledged", "completed", "cancelled"],
      default: "pledged",
    },

    unitsDonated: { type: Number, default: 1 },
    dateDonated: { type: Date, default: null }, // filled in when marked completed
  },
  { timestamps: true }
);

module.exports = mongoose.model("Donation", donationSchema);
