// models/Event.js
// Blood donation camps / volunteer drives, shown on the public events page.

const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    location: { type: String, required: true, trim: true },
    organizerName: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Event", eventSchema);
