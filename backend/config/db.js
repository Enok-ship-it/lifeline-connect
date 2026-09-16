// config/db.js
// Handles the single connection to our MongoDB database.
// We keep this in its own file so server.js stays clean and other files
// can require() the connection logic if they ever need it (e.g. seed.js).

const mongoose = require("mongoose");

async function connectDB() {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.error(`MongoDB connection failed: ${err.message}`);
    // Exit the process if we can't connect to the DB - the server is
    // useless without it, so fail loudly and immediately instead of
    // limping along with broken routes.
    process.exit(1);
  }
}

module.exports = connectDB;
