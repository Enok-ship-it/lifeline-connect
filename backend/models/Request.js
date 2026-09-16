// models/Request.js
// A single emergency blood request posted by a requester (or by anyone
// on behalf of a patient). Donors query these / get matched against these.

const mongoose = require("mongoose");
const { BLOOD_GROUPS } = require("./User");

const requestSchema = new mongoose.Schema(
  {
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    patientName: { type: String, required: true, trim: true },
    bloodGroup: { type: String, enum: BLOOD_GROUPS, required: true },
    unitsNeeded: { type: Number, required: true, min: 1, default: 1 },
    hospitalName: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    area: { type: String, trim: true },
    lat: { type: Number },
    lng: { type: Number },

    urgency: {
      type: String,
      enum: ["high", "medium", "low"],
      default: "high",
    },

    notes: { type: String, trim: true },

    status: {
      type: String,
      enum: ["open", "fulfilled", "cancelled"],
      default: "open",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Request", requestSchema);
