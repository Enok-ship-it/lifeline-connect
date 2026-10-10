// config/db.js
// Handles the single connection to our MongoDB database.
// We keep this in its own file so server.js stays clean and other files
// can require() the connection logic if they ever need it (e.g. seed.js).

const mongoose = require("mongoose");

async function connectDB() {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: Number(process.env.MONGO_MAX_POOL_SIZE || 10),
      minPoolSize: Number(process.env.MONGO_MIN_POOL_SIZE || 2),
      maxIdleTimeMS: Number(process.env.MONGO_MAX_IDLE_TIME_MS || 30000),
      serverSelectionTimeoutMS: Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || 5000),
      socketTimeoutMS: Number(process.env.MONGO_SOCKET_TIMEOUT_MS || 45000),
      retryWrites: true,
    });
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    if (err?.message?.toLowerCase().includes("bad auth")) {
      console.error(
        "MongoDB authentication failed. Verify the database username/password in backend/.env, " +
          "URL-encode special password characters, and confirm the user has access in MongoDB Atlas."
      );
    } else {
      console.error(`MongoDB connection failed: ${err.message}`);
    }
    // Exit the process if we can't connect to the DB - the server is
    // useless without it, so fail loudly and immediately instead of
    // limping along with broken routes.
    process.exit(1);
  }
}

module.exports = connectDB;
