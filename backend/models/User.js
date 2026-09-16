// models/User.js
// One collection holds all three roles (donor / requester / admin).
// This keeps auth logic in one place - a single login form works for
// everyone, and "role" decides what they can see and do.

const mongoose = require("mongoose");

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },

    role: {
      type: String,
      enum: ["donor", "requester", "admin"],
      default: "donor",
    },

    // Only meaningful for donors, but harmless to keep on requesters too
    // (a requester might one day also register as a donor).
    bloodGroup: {
      type: String,
      enum: BLOOD_GROUPS,
      required: function () {
        return this.role === "donor";
      },
    },

    phone: { type: String, required: true },
    city: { type: String, required: true, trim: true },
    area: { type: String, trim: true },

    // Used for distance-based matching. Optional - if a donor doesn't
    // share location, we fall back to matching by city name only.
    lat: { type: Number },
    lng: { type: Number },

    // A donor who donated recently shouldn't be matched again right away.
    lastDonationDate: { type: Date, default: null },
    isAvailable: { type: Boolean, default: true },

    // Simple gamification - +10 points per completed donation.
    points: { type: Number, default: 0 },

    // Admin can verify donors (e.g. after confirming ID/blood test report).
    // Not required to use the platform, just adds a "Verified" badge.
    verified: { type: Boolean, default: false },
  },
  { timestamps: true } // adds createdAt / updatedAt automatically
);

// Never send the password hash back in API responses.
userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  return obj;
};

module.exports = mongoose.model("User", userSchema);
module.exports.BLOOD_GROUPS = BLOOD_GROUPS;
