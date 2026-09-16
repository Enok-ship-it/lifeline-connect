// middleware/auth.js
//
// Two middleware functions that protect routes:
//   protect        - checks the request has a valid login token
//   restrictTo(...) - checks the logged-in user has one of the allowed roles
//
// Express middleware runs BEFORE the route's controller function. If it
// calls next(), the request continues on. If it doesn't, the request
// stops there and the error response is sent instead.

const jwt = require("jsonwebtoken");
const User = require("../models/User");

async function protect(req, res, next) {
  try {
    const authHeader = req.headers.authorization; // expected: "Bearer <token>"

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Not logged in. Please log in first." });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: "This account no longer exists." });
    }

    req.user = user; // attach the logged-in user to the request for later use
    next();
  } catch (err) {
    return res.status(401).json({ message: "Session expired or invalid. Please log in again." });
  }
}

function restrictTo(...allowedRoles) {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "You don't have permission to do that." });
    }
    next();
  };
}

// softAuth: for routes that work for EVERYONE (like public donor search)
// but should show a bit more detail (like a phone number) to people who
// happen to be logged in. Unlike `protect`, this never blocks the
// request - if there's no token, or a bad one, req.user is just left
// undefined and the route continues normally.
async function softAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (user) req.user = user;
    }
  } catch (err) {
    // Invalid/expired token on a soft route just means "treat as a guest" -
    // it is NOT an error worth blocking the request over.
  }
  next();
}

module.exports = { protect, restrictTo, softAuth };
