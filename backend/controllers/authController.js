// controllers/authController.js
//
// A "controller" holds the actual logic for a route - the route file just
// says WHICH url maps to WHICH function; this file says what that function
// DOES.

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const validator = require("validator");
const User = require("../models/User");

function signToken(userId) {
  // The token encodes the user's id and expires after 7 days.
  // We don't put sensitive data (like the password) inside the token,
  // because tokens are readable by anyone who has them, they're just
  // not editable without knowing our secret key.
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

// POST /api/auth/register
async function register(req, res) {
  try {
    const { name, email, password, role, bloodGroup, phone, city, area, lat, lng } = req.body;

    if (!name || !email || !password || !phone || !city) {
      return res.status(400).json({ message: "Please fill in all required fields." });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: "Please enter a valid email address." });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters long." });
    }

    if (!validator.isMobilePhone(phone, "any", { strictMode: false })) {
      return res.status(400).json({ message: "Please enter a valid phone number." });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: "An account with this email already exists." });
    }

    // bcrypt.hash "salts" the password before hashing it, so even two
    // users with the same password get different hashes in the database.
    // The number 10 is the "cost factor" - a reasonable default that
    // balances security against speed.
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: role || "donor",
      bloodGroup,
      phone,
      city,
      area,
      lat,
      lng,
    });

    const token = signToken(user._id);
    res.status(201).json({ token, user: user.toSafeObject() });
  } catch (err) {
    res.status(500).json({ message: "Registration failed.", error: err.message });
  }
}

// POST /api/auth/login
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Please enter your email and password." });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Deliberately vague - we don't want to reveal WHICH field was wrong,
      // since that helps an attacker guess valid emails.
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const token = signToken(user._id);
    res.json({ token, user: user.toSafeObject() });
  } catch (err) {
    res.status(500).json({ message: "Login failed.", error: err.message });
  }
}

// GET /api/auth/me  (requires login - returns whoever the token belongs to)
async function getMe(req, res) {
  res.json({ user: req.user.toSafeObject() });
}

module.exports = { register, login, getMe };
